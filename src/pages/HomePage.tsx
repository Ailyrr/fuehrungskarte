import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteProject,
  estimateUsedBytes,
  exportProject,
  importProjectFromFile,
  listProjects,
} from '../lib/storage';
import type { ProjectSummary } from '../types';
import NewProjectModal from '../components/NewProjectModal';

const STORAGE_BUDGET = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>(() => listProjects());
  const [showNew, setShowNew] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setProjects(listProjects());
  const usedBytes = estimateUsedBytes();

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteProject(id);
      refresh();
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    try {
      const project = await importProjectFromFile(file);
      refresh();
      navigate(`/project/${project.id}`);
    } catch (err) {
      setImportError((err as Error).message || 'Failed to import file.');
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold tracking-tight">Führungskarte</h1>
        <p className="text-sm text-gray-400">Digital tactical command maps</p>
      </header>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
          <p className="mb-2 text-lg">No projects yet</p>
          <p className="text-sm">Create a map for a city or area to get started.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl bg-gray-800/70">
              <div className="flex items-stretch">
                <button
                  onClick={() => navigate(`/project/${p.id}`)}
                  className="flex-1 px-4 py-4 text-left active:bg-gray-700/60"
                >
                  <div className="text-base font-semibold">{p.name}</div>
                  <div className="truncate text-sm text-gray-400">{p.label}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {p.objectCount} object{p.objectCount === 1 ? '' : 's'} · {timeAgo(p.updatedAt)}
                  </div>
                </button>
                <div className="flex flex-col border-l border-gray-700/60">
                  <button
                    onClick={() => exportProject(p.id)}
                    className="flex-1 px-4 text-lg text-gray-300 hover:bg-gray-700"
                    title="Export / share"
                    aria-label="Export project"
                  >
                    ⇪
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="flex-1 border-t border-gray-700/60 px-4 text-lg text-red-400 hover:bg-gray-700"
                    title="Delete"
                    aria-label="Delete project"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {importError && <p className="mt-4 text-sm text-red-400">{importError}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
        >
          Import project
        </button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        <span className="text-xs text-gray-500">
          {formatBytes(usedBytes)} / ~{formatBytes(STORAGE_BUDGET)} used
        </span>
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-900/40 active:bg-sky-700"
      >
        <span className="text-xl leading-none">+</span> New project
      </button>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(project) => navigate(`/project/${project.id}`)}
        />
      )}
    </div>
  );
}
