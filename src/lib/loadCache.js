/**
 * Admin panel: the last data each screen loaded, kept in memory (never stored on disk), so opening a screen
 * again shows it at once while a fresh copy loads in the background (see useLoad in admin/ui.jsx).
 *
 * Safety rules:
 *  - Any change sent to the server (POST/PATCH/PUT/DELETE) forgets everything, so no screen ever shows data
 *    from before a change. A load that started before the change is not kept either (the "generation").
 *  - A different person signing in (or signing out) forgets everything.
 *  - Data older than MAX_AGE_MS is not shown; the screen loads as if new.
 *  - Screens that must never show older data (seats for sale, cash quotes, boarding lists) opt out.
 */
import { useSyncExternalStore } from "react";

const MAX_AGE_MS = 5 * 60_000;
const MAX_ENTRIES = 80;
const cache = new Map(); // key -> { data, at }
let generation = 0;

export const loadCacheGeneration = () => generation;

/** Forgets every saved screen. */
export function clearLoadCache() {
  cache.clear();
  generation++;
}

/** The saved data for `key`, or undefined when there is none (or it is too old). */
export function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > MAX_AGE_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.data;
}

/** Saves `data` for `key`, unless something changed on the server since the load started (`gen`). */
export function setCached(key, data, gen) {
  if (gen !== generation) return;
  cache.delete(key); // re-insert at the end: the Map's order is "least recently saved first"
  cache.set(key, { data, at: Date.now() });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
}

/* "Updating…": how many screens are showing saved data while their fresh copy loads. */
let refreshing = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
export function refreshStarted() {
  refreshing++;
  emit();
  return () => {
    refreshing--;
    emit();
  };
}
export const useRefreshing = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => refreshing > 0,
    () => false,
  );
