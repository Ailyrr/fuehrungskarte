import type { Project, ProjectExport, ProjectSummary } from '../types';
import { uid } from './id';

/**
 * Storage layer for projects. Data lives entirely in localStorage today, but
 * everything goes through this module so a cloud sync / IndexedDB backend can
 * be slotted in later without touching the UI.
 */

const INDEX_KEY = 'fk:projects';
const projectKey = (id: string) => `fk:project:${id}`;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function summarize(project: Project): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    label: project.location.label,
    updatedAt: project.updatedAt,
    objectCount: project.objects.length,
  };
}

export function listProjects(): ProjectSummary[] {
  const index = readJSON<ProjectSummary[]>(INDEX_KEY) ?? [];
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | null {
  return readJSON<Project>(projectKey(id));
}

function writeIndex(summaries: ProjectSummary[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(summaries));
}

export function saveProject(project: Project): void {
  const stored: Project = { ...project, updatedAt: Date.now() };
  try {
    localStorage.setItem(projectKey(stored.id), JSON.stringify(stored));
  } catch (err) {
    // Most likely QuotaExceededError (~5MB localStorage limit).
    console.error('Failed to save project — storage may be full.', err);
    throw new StorageFullError();
  }
  const index = listProjects().filter((s) => s.id !== stored.id);
  index.push(summarize(stored));
  writeIndex(index);
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id));
  writeIndex(listProjects().filter((s) => s.id !== id));
}

export class StorageFullError extends Error {
  constructor() {
    super('Local storage is full. Export and remove some projects to free space.');
    this.name = 'StorageFullError';
  }
}

/** Rough estimate of how much of the localStorage budget is used, in bytes. */
export function estimateUsedBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('fk:')) continue;
    const value = localStorage.getItem(key) ?? '';
    total += key.length + value.length;
  }
  // localStorage stores UTF-16 code units => ~2 bytes each.
  return total * 2;
}

// --- Export / import ---------------------------------------------------------

function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

export function exportProject(id: string): void {
  const project = getProject(id);
  if (!project) return;
  const payload: ProjectExport = { format: 'fuehrungskarte', version: 1, project };
  download(`${slugify(project.name)}.fk.json`, JSON.stringify(payload, null, 2));
}

function isValidProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<Project>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    Array.isArray(p.objects) &&
    !!p.camera &&
    Array.isArray(p.camera.center)
  );
}

/**
 * Parse a previously exported file and store it as a new project (a fresh id is
 * assigned so importing never overwrites an existing project).
 */
export async function importProjectFromFile(file: File): Promise<Project> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectExport | Project;
  const raw = 'project' in (parsed as ProjectExport) ? (parsed as ProjectExport).project : (parsed as Project);
  if (!isValidProject(raw)) {
    throw new Error('This file is not a valid Führungskarte project.');
  }
  const now = Date.now();
  const imported: Project = {
    ...raw,
    id: uid(),
    name: raw.name,
    createdAt: raw.createdAt ?? now,
    updatedAt: now,
  };
  saveProject(imported);
  return imported;
}
