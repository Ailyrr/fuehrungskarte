import { useEffect, useRef, useState } from 'react';
import type { Camera, Project } from '../types';
import { searchLocation, type GeocodeResult } from '../lib/geocode';
import { saveProject } from '../lib/storage';
import { uid } from '../lib/id';

interface Props {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

function zoomForBbox(bbox?: [number, number, number, number]): number {
  if (!bbox) return 12;
  const [west, south, east, north] = bbox;
  const maxSpan = Math.max(Math.abs(east - west), Math.abs(north - south));
  if (maxSpan <= 0) return 13;
  // Rough mapping from degree span to a sensible zoom level.
  const zoom = Math.log2(360 / maxSpan);
  return Math.min(16, Math.max(3, zoom));
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selected && selected.label === query) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const found = await searchLocation(query, controller.signal);
        setResults(found);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Could not reach the location search service. Check your connection.');
        }
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  function choose(result: GeocodeResult) {
    setSelected(result);
    setResults([]);
    setQuery(result.label);
    if (!name.trim()) {
      setName(result.label.split(',')[0]);
    }
  }

  function create() {
    if (!selected) return;
    const camera: Camera = {
      center: selected.center,
      zoom: zoomForBbox(selected.bbox),
      bearing: 0,
      pitch: 0,
    };
    const now = Date.now();
    const project: Project = {
      id: uid(),
      name: name.trim() || selected.label.split(',')[0] || 'Untitled',
      createdAt: now,
      updatedAt: now,
      location: { query, label: selected.label },
      camera,
      objects: [],
    };
    saveProject(project);
    onCreated(project);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-gray-900 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">New project</h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-800" aria-label="Close">
            ✕
          </button>
        </div>

        <label className="mb-1 text-sm text-gray-400">Location (city or area)</label>
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="e.g. Osaka, or Seeland Switzerland"
          className="mb-2 w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
        />

        {loading && <p className="px-1 py-2 text-sm text-gray-400">Searching…</p>}
        {error && <p className="px-1 py-2 text-sm text-red-400">{error}</p>}

        {results.length > 0 && (
          <ul className="mb-2 max-h-56 divide-y divide-gray-800 overflow-y-auto rounded-lg bg-gray-800/60">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => choose(r)}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-700 active:bg-gray-700"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <>
            <label className="mb-1 mt-2 text-sm text-gray-400">Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="mb-4 w-full rounded-lg bg-gray-800 px-4 py-3 text-base outline-none ring-sky-500 focus:ring-2"
            />
          </>
        )}

        <button
          onClick={create}
          disabled={!selected}
          className="mt-2 w-full rounded-lg bg-sky-600 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
        >
          Create map
        </button>
      </div>
    </div>
  );
}
