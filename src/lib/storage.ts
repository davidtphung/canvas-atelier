import type { ProjectDocument, ProjectMeta } from '../types';

const LIBRARY_KEY = 'canvas-atelier:library';
const AUTOSAVE_KEY = 'canvas-atelier:autosave';
const LAST_EXPORT_KEY = 'canvas-atelier:last-export-meta';
const MAX_PROJECTS = 24;

export function loadLibrary(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectMeta[];
  } catch {
    return [];
  }
}

function saveLibrary(list: ProjectMeta[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(list.slice(0, MAX_PROJECTS)));
}

export function saveProjectDocument(doc: ProjectDocument): void {
  const key = projectKey(doc.meta.id);
  localStorage.setItem(key, JSON.stringify(doc));
  const lib = loadLibrary().filter((p) => p.id !== doc.meta.id);
  lib.unshift(doc.meta);
  saveLibrary(lib);
}

export function loadProjectDocument(id: string): ProjectDocument | null {
  try {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as ProjectDocument;
  } catch {
    return null;
  }
}

export function deleteProjectDocument(id: string): void {
  localStorage.removeItem(projectKey(id));
  saveLibrary(loadLibrary().filter((p) => p.id !== id));
}

export function autosave(doc: ProjectDocument): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
  } catch {
    // Quota — drop thumbnail and retry
    try {
      const slim = { ...doc, meta: { ...doc.meta, thumbnail: undefined } };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

export function loadAutosave(): ProjectDocument | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectDocument;
  } catch {
    return null;
  }
}

export function setLastExportMeta(meta: {
  filename: string;
  format: string;
  at: string;
}): void {
  localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(meta));
}

export function getLastExportMeta(): {
  filename: string;
  format: string;
  at: string;
} | null {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function projectKey(id: string): string {
  return `canvas-atelier:project:${id}`;
}

export function parseProjectFile(text: string): ProjectDocument {
  const data = JSON.parse(text) as ProjectDocument;
  if (!data?.meta?.id || !Array.isArray(data.shapes)) {
    throw new Error('Invalid project file');
  }
  return data;
}
