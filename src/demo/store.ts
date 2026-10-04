/**
 * Browser-side demo store: the same MockAdapter the server app uses, persisted to localStorage.
 * Every page reads synchronously from it; mutations call commit() to save + re-render.
 */
import { useSyncExternalStore } from "react";
import { MockAdapter, mockDb, setMockDb } from "@/lib/data/mock-adapter";
import type { DbState, Profile } from "@/lib/data/types";
import { createDemoState } from "./seed";

const DB_KEY = "dts-demo-db";
const UID_KEY = "dts-demo-uid";
const SCHEMA = 1;

export const demoData = new MockAdapter();

let version = 0;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};

function load() {
  if (loaded) return;
  loaded = true;
  let state: DbState | null = null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as { schema: number; db: DbState }) : null;
    if (parsed?.schema === SCHEMA) state = parsed.db;
  } catch {
    state = null;
  }
  setMockDb(state ?? createDemoState());
}

export function commit() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({ schema: SCHEMA, db: mockDb() }));
  } catch {
    /* storage full or blocked: the demo still works for this tab */
  }
  emit();
}

export function resetDemo() {
  setMockDb(createDemoState());
  flash = null;
  commit();
}

export function currentUid(): string | null {
  try {
    return localStorage.getItem(UID_KEY);
  } catch {
    return null;
  }
}
export function setUid(id: string | null) {
  try {
    if (id) localStorage.setItem(UID_KEY, id);
    else localStorage.removeItem(UID_KEY);
  } catch {}
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** ready=false during the static prerender and the first hydration pass (no localStorage there). */
export function useDemo(): { ready: boolean; user: Profile | null } {
  const v = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return version;
    },
    () => -1,
  );
  if (v < 0) return { ready: false, user: null };
  const uid = currentUid();
  return { ready: true, user: uid ? demoData.getProfileNow(uid) : null };
}

// One-shot page messages (errors, "saved") for actions that stay on the page.
export interface Flash { page: string; error?: string; saved?: string; paid?: string }
let flash: Flash | null = null;
export function setFlash(f: Flash) {
  flash = f;
  emit();
}
export function clearFlash() {
  if (flash) {
    flash = null;
    emit();
  }
}
export function getFlash(page: string): Omit<Flash, "page"> {
  return flash && flash.page === page ? flash : {};
}
