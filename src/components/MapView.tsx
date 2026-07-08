import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useProjectStore } from '../store/projectStore';
import { createMarkerElement, updateMarkerElement } from '../lib/markers';
import { areasToFeatureCollection, centroid, draftToFeatureCollection } from '../lib/areas';
import type {
  AreaObject,
  CustomSymbolObject,
  CustomSymbolPreset,
  DrawingObject,
  LabelObject,
  LngLat,
  MapObject,
  SymbolObject,
} from '../types';
import { uid } from '../lib/id';
import { listCustomSymbolPresets, saveCustomSymbolPreset } from '../lib/storage';
import AddMenu, { type AddKind } from './AddMenu';
import LabelEditor from './LabelEditor';
import DrawingCanvas from './DrawingCanvas';
import SymbolCreator from './SymbolCreator';
import CustomSymbolCreator from './CustomSymbolCreator';
import AreaEditor from './AreaEditor';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

interface MarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
}

type EditorState =
  | { kind: 'label'; object: LabelObject | null }
  | { kind: 'drawing'; object: DrawingObject | null }
  | { kind: 'symbol'; object: SymbolObject | null }
  | { kind: 'custom'; object: CustomSymbolObject | null }
  | { kind: 'area'; object: AreaObject | null; points?: LngLat[] }
  | null;

function addAreaLayers(map: maplibregl.Map) {
  const empty = { type: 'FeatureCollection' as const, features: [] };
  map.addSource('fk-areas', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'fk-areas-fill',
    type: 'fill',
    source: 'fk-areas',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.3 },
  });
  map.addLayer({
    id: 'fk-areas-line',
    type: 'line',
    source: 'fk-areas',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['case', ['==', ['get', 'sel'], 1], '#ffffff', ['get', 'color']],
      'line-width': ['case', ['==', ['get', 'sel'], 1], 4, 2],
    },
  });

  map.addSource('fk-draft', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'fk-draft-line',
    type: 'line',
    source: 'fk-draft',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#38bdf8', 'line-width': 2, 'line-dasharray': [2, 1.5] },
  });
  map.addLayer({
    id: 'fk-draft-pts',
    type: 'circle',
    source: 'fk-draft',
    paint: {
      'circle-radius': 5,
      'circle-color': '#38bdf8',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
}

export default function MapView() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const areaLabelsRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const geolocateControlRef = useRef<maplibregl.GeolocateControl | null>(null);
  const onMapClickRef = useRef<(e: maplibregl.MapMouseEvent) => void>(() => {});

  const project = useProjectStore((s) => s.project);
  const objects = project?.objects;
  const selectedId = useProjectStore((s) => s.selectedId);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const errorMessage = useProjectStore((s) => s.errorMessage);

  const [bearing, setBearing] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomSymbolPreset[]>(() => listCustomSymbolPresets());
  /** null = not drawing; array = polygon vertices captured so far. */
  const [draftPoints, setDraftPoints] = useState<LngLat[] | null>(null);

  const selectedObject = useMemo<MapObject | null>(
    () => objects?.find((o) => o.id === selectedId) ?? null,
    [objects, selectedId],
  );

  // Initialise the map exactly once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const initial = useProjectStore.getState().project;
    if (!initial) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: initial.camera.center,
      zoom: initial.camera.zoom,
      bearing: initial.camera.bearing,
      pitch: initial.camera.pitch,
      attributionControl: { compact: true },
      maxPitch: 75,
    });
    mapRef.current = map;

    const geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 10000 },
      fitBoundsOptions: { maxZoom: 17 },
      trackUserLocation: true,
      showAccuracyCircle: true,
      showUserLocation: true,
    });
    geolocateControlRef.current = geolocateControl;
    map.addControl(geolocateControl, 'bottom-left');

    map.on('load', () => {
      addAreaLayers(map);
      setMapLoaded(true);
    });

    map.on('moveend', () => {
      const c = map.getCenter();
      useProjectStore.getState().setCamera({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });
    map.on('rotate', () => setBearing(map.getBearing()));
    map.on('click', (e) => onMapClickRef.current(e));

    return () => {
      geolocateControlRef.current = null;
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      areaLabelsRef.current.clear();
      setMapLoaded(false);
    };
  }, []);

  // Keep the map click behaviour in sync with the current draw/selection state.
  useEffect(() => {
    onMapClickRef.current = (e) => {
      const map = mapRef.current;
      if (!map) return;
      if (draftPoints !== null) {
        setDraftPoints([...draftPoints, [e.lngLat.lng, e.lngLat.lat]]);
        return;
      }
      const feats = map.queryRenderedFeatures(e.point, { layers: ['fk-areas-fill'] });
      const hit = feats[0]?.properties?.id as string | undefined;
      useProjectStore.getState().select(hit ?? null);
    };
  }, [draftPoints]);

  // Reconcile point-object markers (labels, drawings, symbols, custom symbols).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !objects) return;
    const markers = markersRef.current;
    const pointObjects = objects.filter((o) => o.type !== 'area');
    const present = new Set(pointObjects.map((o) => o.id));

    for (const [id, entry] of markers) {
      if (!present.has(id)) {
        entry.marker.remove();
        markers.delete(id);
      }
    }

    for (const object of pointObjects) {
      let entry = markers.get(object.id);
      if (!entry) {
        const el = createMarkerElement(object);
        const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' }).setLngLat(
          object.lngLat,
        );
        let moved = false;
        marker.on('dragstart', () => {
          moved = false;
        });
        marker.on('drag', () => {
          moved = true;
        });
        marker.on('dragend', () => {
          const ll = marker.getLngLat();
          useProjectStore.getState().updateObject(object.id, { lngLat: [ll.lng, ll.lat] });
        });
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (moved) {
            moved = false;
            return;
          }
          useProjectStore.getState().select(object.id);
        });
        marker.addTo(map);
        entry = { marker, el };
        markers.set(object.id, entry);
      }
      entry.marker.setLngLat(object.lngLat);
      updateMarkerElement(entry.el, object, object.id === selectedId);
    }
  }, [objects, selectedId]);

  // Reconcile area polygons (map layers) and their centroid labels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !objects) return;
    const areas = objects.filter((o): o is AreaObject => o.type === 'area');

    const source = map.getSource('fk-areas') as maplibregl.GeoJSONSource | undefined;
    source?.setData(areasToFeatureCollection(areas, selectedId));

    const labels = areaLabelsRef.current;
    const present = new Set(areas.filter((a) => a.label).map((a) => a.id));
    for (const [id, marker] of labels) {
      if (!present.has(id)) {
        marker.remove();
        labels.delete(id);
      }
    }
    for (const area of areas) {
      if (!area.label) continue;
      let marker = labels.get(area.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'fk-area-label';
        el.style.pointerEvents = 'none';
        marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(area.lngLat).addTo(map);
        labels.set(area.id, marker);
      }
      marker.getElement().textContent = area.label;
      marker.setLngLat(area.lngLat);
    }
  }, [objects, selectedId, mapLoaded]);

  // Update the in-progress polygon preview.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource('fk-draft') as maplibregl.GeoJSONSource | undefined;
    source?.setData(draftToFeatureCollection(draftPoints ?? []));
  }, [draftPoints, mapLoaded]);

  function mapCenter(): LngLat {
    const c = mapRef.current!.getCenter();
    return [c.lng, c.lat];
  }

  function resetNorth() {
    mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 300 });
  }

  function zoomBy(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 200 });
  }

  function onAdd(kind: AddKind) {
    setMenuOpen(false);
    if (kind === 'area') {
      useProjectStore.getState().select(null);
      setDraftPoints([]);
      return;
    }
    setEditor({ kind, object: null } as EditorState);
  }

  function addCustomPreset(preset: CustomSymbolPreset) {
    setMenuOpen(false);
    const obj: CustomSymbolObject = {
      id: uid(),
      type: 'custom',
      lngLat: mapCenter(),
      affiliation: preset.affiliation,
      text: preset.text,
      label: preset.label,
      color: preset.color,
      size: preset.size,
    };
    store.addObject(obj);
  }

  function savePresetFromCustom(value: {
    name: string;
    affiliation: string;
    text: string;
    label: string;
    color?: string;
    size: number;
  }) {
    saveCustomSymbolPreset({
      id: uid(),
      name: value.name,
      affiliation: value.affiliation,
      text: value.text,
      label: value.label || undefined,
      color: value.color,
      size: value.size,
      createdAt: Date.now(),
    });
    setCustomPresets(listCustomSymbolPresets());
    setEditor(null);
  }

  function editSelected() {
    if (!selectedObject) return;
    setEditor({ kind: selectedObject.type, object: selectedObject } as EditorState);
  }

  function finishDrawing() {
    if (!draftPoints || draftPoints.length < 3) return;
    const points = draftPoints;
    setDraftPoints(null);
    setEditor({ kind: 'area', object: null, points });
  }

  function cancelDrawing() {
    setDraftPoints(null);
  }

  const store = useProjectStore.getState();
  const drawing = draftPoints !== null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto flex h-11 items-center gap-1 rounded-full bg-gray-900/85 px-4 font-semibold text-white shadow backdrop-blur active:bg-gray-800"
        >
          ‹ Projects
        </button>
        <div className="pointer-events-auto flex max-w-[55%] items-center rounded-full bg-gray-900/85 px-4 py-2 shadow backdrop-blur">
          <button
            onClick={() => {
              const name = prompt('Rename project', project?.name ?? '');
              if (name && name.trim()) useProjectStore.getState().rename(name.trim());
            }}
            className="truncate text-sm font-semibold text-white"
          >
            {project?.name}
          </button>
          <span
            className={`ml-2 h-2 w-2 shrink-0 rounded-full ${
              saveStatus === 'saving'
                ? 'bg-yellow-400'
                : saveStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-green-400'
            }`}
            title={saveStatus === 'error' ? errorMessage ?? 'Save error' : `Saved (${saveStatus})`}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="absolute inset-x-3 top-20 z-30 rounded-lg bg-red-900/90 px-4 py-2 text-sm text-white shadow">
          {errorMessage}
        </div>
      )}

      {/* Right-side controls */}
      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
        <button
          onClick={() => zoomBy(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900/85 text-2xl font-bold text-white shadow backdrop-blur active:bg-gray-800"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900/85 text-2xl font-bold text-white shadow backdrop-blur active:bg-gray-800"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={resetNorth}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900/85 text-white shadow backdrop-blur active:bg-gray-800"
          aria-label="Reset bearing to north"
          title="Reset north"
        >
          <span style={{ transform: `rotate(${-bearing}deg)` }} className="text-lg leading-none">
            ↑
          </span>
        </button>
      </div>

      {/* Draw-area mode banner + toolbar */}
      {drawing && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center px-4">
            <div className="rounded-full bg-sky-900/90 px-4 py-2 text-sm font-medium text-white shadow backdrop-blur">
              Tap the map to add points {draftPoints!.length > 0 && `· ${draftPoints!.length} added`}
            </div>
          </div>
          <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900/95 p-1.5 shadow-xl backdrop-blur">
            <button
              onClick={() => setDraftPoints((p) => (p && p.length ? p.slice(0, -1) : p))}
              className="rounded-full bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!draftPoints || draftPoints.length === 0}
            >
              Undo
            </button>
            <button onClick={cancelDrawing} className="rounded-full px-4 py-2.5 text-sm font-semibold text-gray-300">
              Cancel
            </button>
            <button
              onClick={finishDrawing}
              disabled={!draftPoints || draftPoints.length < 3}
              className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-gray-700 disabled:text-gray-500"
            >
              Finish
            </button>
          </div>
        </>
      )}

      {/* Selection toolbar */}
      {selectedObject && !drawing && (
        <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900/95 p-1.5 shadow-xl backdrop-blur">
          <button onClick={editSelected} className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white">
            Edit
          </button>
          <button
            onClick={() => store.removeObject(selectedObject.id)}
            className="rounded-full bg-red-600/90 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Delete
          </button>
          <button
            onClick={() => store.select(null)}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-gray-300"
          >
            Done
          </button>
        </div>
      )}

      {/* Add FAB */}
      {!drawing && (
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-3xl font-light text-white shadow-lg shadow-sky-900/40 active:bg-sky-700"
          aria-label="Add object"
        >
          +
        </button>
      )}

      {/* Center crosshair marks where new point objects drop */}
      {!menuOpen && !editor && !drawing && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-white/40">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <line x1="13" y1="2" x2="13" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="13" y1="16" x2="13" y2="24" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="2" />
            <line x1="16" y1="13" x2="24" y2="13" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}

      {menuOpen && (
        <AddMenu
          presets={customPresets}
          onSelect={onAdd}
          onPreset={addCustomPreset}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {editor?.kind === 'label' && (
        <LabelEditor
          initialText={editor.object?.text}
          initialColor={editor.object?.color}
          initialBg={editor.object?.bg}
          onCancel={() => setEditor(null)}
          onSave={({ text, color, bg }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { text, color, bg });
            } else {
              const obj: LabelObject = { id: uid(), type: 'label', lngLat: mapCenter(), text, color, bg };
              store.addObject(obj);
            }
            setEditor(null);
          }}
        />
      )}

      {editor?.kind === 'drawing' && (
        <DrawingCanvas
          initialStrokes={editor.object?.strokes}
          initialSize={editor.object ? { w: editor.object.w, h: editor.object.h } : undefined}
          initialScale={editor.object?.scale}
          onCancel={() => setEditor(null)}
          onSave={({ strokes, w, h, scale }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { strokes, w, h, scale });
            } else {
              const obj: DrawingObject = { id: uid(), type: 'drawing', lngLat: mapCenter(), strokes, w, h, scale };
              store.addObject(obj);
            }
            setEditor(null);
          }}
        />
      )}

      {editor?.kind === 'symbol' && (
        <SymbolCreator
          initialSidc={editor.object?.sidc}
          initialLabel={editor.object?.label}
          onCancel={() => setEditor(null)}
          onSave={({ sidc, label, size }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { sidc, label, size });
            } else {
              const obj: SymbolObject = { id: uid(), type: 'symbol', lngLat: mapCenter(), sidc, label, size };
              store.addObject(obj);
            }
            setEditor(null);
          }}
        />
      )}

      {editor?.kind === 'custom' && (
        <CustomSymbolCreator
          initialAffiliation={editor.object?.affiliation}
          initialText={editor.object?.text}
          initialLabel={editor.object?.label}
          initialColor={editor.object?.color}
          allowPreset={!editor.object}
          onCancel={() => setEditor(null)}
          onSavePreset={savePresetFromCustom}
          onSave={({ affiliation, text, label, color, size }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { affiliation, text, label, color, size });
            } else {
              const obj: CustomSymbolObject = {
                id: uid(),
                type: 'custom',
                lngLat: mapCenter(),
                affiliation,
                text,
                label,
                color,
                size,
              };
              store.addObject(obj);
            }
            setEditor(null);
          }}
        />
      )}

      {editor?.kind === 'area' && (
        <AreaEditor
          isNew={!editor.object}
          initialColor={editor.object?.color}
          initialLabel={editor.object?.label}
          onCancel={() => setEditor(null)}
          onSave={({ color, label }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { color, label });
            } else if (editor.points) {
              const obj: AreaObject = {
                id: uid(),
                type: 'area',
                lngLat: centroid(editor.points),
                points: editor.points,
                color,
                label,
              };
              store.addObject(obj);
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}
