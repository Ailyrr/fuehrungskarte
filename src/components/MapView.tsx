import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import { useProjectStore } from '../store/projectStore';
import { createMarkerElement, updateMarkerElement } from '../lib/markers';
import type { DrawingObject, LabelObject, MapObject, SymbolObject } from '../types';
import { uid } from '../lib/id';
import AddMenu from './AddMenu';
import LabelEditor from './LabelEditor';
import DrawingCanvas from './DrawingCanvas';
import SymbolCreator from './SymbolCreator';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

interface MarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
}

type EditorState =
  | { kind: 'label'; object: LabelObject | null }
  | { kind: 'drawing'; object: DrawingObject | null }
  | { kind: 'symbol'; object: SymbolObject | null }
  | null;

export default function MapView() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  const project = useProjectStore((s) => s.project);
  const objects = project?.objects;
  const selectedId = useProjectStore((s) => s.selectedId);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const errorMessage = useProjectStore((s) => s.errorMessage);

  const [bearing, setBearing] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);

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
    map.on('click', () => useProjectStore.getState().select(null));

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Reconcile object markers whenever objects or the selection change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !objects) return;
    const markers = markersRef.current;
    const present = new Set(objects.map((o) => o.id));

    for (const [id, entry] of markers) {
      if (!present.has(id)) {
        entry.marker.remove();
        markers.delete(id);
      }
    }

    for (const object of objects) {
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

  function mapCenter(): [number, number] {
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

  function openEditorFor(kind: 'label' | 'drawing' | 'symbol') {
    setMenuOpen(false);
    setEditor({ kind, object: null } as EditorState);
  }

  function editSelected() {
    if (!selectedObject) return;
    setEditor({ kind: selectedObject.type, object: selectedObject } as EditorState);
  }

  const store = useProjectStore.getState();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

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

      {/* Selection toolbar */}
      {selectedObject && (
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
      {!selectedObject && (
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-3xl font-light text-white shadow-lg shadow-sky-900/40 active:bg-sky-700"
          aria-label="Add object"
        >
          +
        </button>
      )}

      {/* Center crosshair when adding is available */}
      {!selectedObject && !menuOpen && !editor && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-white/40">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <line x1="13" y1="2" x2="13" y2="10" stroke="currentColor" strokeWidth="2" />
            <line x1="13" y1="16" x2="13" y2="24" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="2" />
            <line x1="16" y1="13" x2="24" y2="13" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      )}

      {menuOpen && <AddMenu onSelect={openEditorFor} onClose={() => setMenuOpen(false)} />}

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
          onCancel={() => setEditor(null)}
          onSave={({ strokes, w, h }) => {
            if (editor.object) {
              store.updateObject(editor.object.id, { strokes, w, h });
            } else {
              const obj: DrawingObject = { id: uid(), type: 'drawing', lngLat: mapCenter(), strokes, w, h };
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
    </div>
  );
}
