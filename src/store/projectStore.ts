import { create } from 'zustand';
import type { Camera, MapObject, Project } from '../types';
import { getProject, saveProject, StorageFullError } from '../lib/storage';

interface ProjectState {
  project: Project | null;
  /** 'idle' | 'saving' | 'saved' | 'error' */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage: string | null;
  /** id of the object currently selected for editing, if any. */
  selectedId: string | null;

  load: (id: string) => boolean;
  close: () => void;
  select: (id: string | null) => void;
  rename: (name: string) => void;
  setCamera: (camera: Camera) => void;
  addObject: (object: MapObject) => void;
  updateObject: (id: string, patch: Partial<MapObject>) => void;
  removeObject: (id: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(get: () => ProjectState, set: (partial: Partial<ProjectState>) => void) {
  const { project } = get();
  if (!project) return;
  set({ saveStatus: 'saving' });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const current = get().project;
    if (!current) return;
    try {
      saveProject(current);
      set({ saveStatus: 'saved', errorMessage: null });
    } catch (err) {
      const message = err instanceof StorageFullError ? err.message : 'Failed to save project.';
      set({ saveStatus: 'error', errorMessage: message });
    }
  }, 500);
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  saveStatus: 'idle',
  errorMessage: null,
  selectedId: null,

  load: (id) => {
    const project = getProject(id);
    if (!project) return false;
    set({ project, saveStatus: 'idle', errorMessage: null, selectedId: null });
    return true;
  },

  close: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    set({ project: null, selectedId: null, saveStatus: 'idle', errorMessage: null });
  },

  select: (id) => set({ selectedId: id }),

  rename: (name) => {
    const { project } = get();
    if (!project) return;
    set({ project: { ...project, name } });
    scheduleSave(get, set);
  },

  setCamera: (camera) => {
    const { project } = get();
    if (!project) return;
    set({ project: { ...project, camera } });
    scheduleSave(get, set);
  },

  addObject: (object) => {
    const { project } = get();
    if (!project) return;
    set({ project: { ...project, objects: [...project.objects, object] }, selectedId: object.id });
    scheduleSave(get, set);
  },

  updateObject: (id, patch) => {
    const { project } = get();
    if (!project) return;
    const objects = project.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as MapObject) : o));
    set({ project: { ...project, objects } });
    scheduleSave(get, set);
  },

  removeObject: (id) => {
    const { project } = get();
    if (!project) return;
    const objects = project.objects.filter((o) => o.id !== id);
    const selectedId = get().selectedId === id ? null : get().selectedId;
    set({ project: { ...project, objects }, selectedId });
    scheduleSave(get, set);
  },
}));
