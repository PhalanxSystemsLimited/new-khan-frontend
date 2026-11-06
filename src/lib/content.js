/**
 * Website content saved in the admin panel. Loaded once at start-up (main.jsx), before the app's modules are
 * imported, so every page and helper reads the saved text. Live mode only; demo mode uses the built-in text.
 *
 * Order of preference: the server's copy (waits at most TIMEOUT_MS), then the copy this browser saved last
 * time, then the text built into the site. A failure never stops the site from loading.
 */
import { applyLegalContent } from "../data/legal";
import { applySiteContent } from "../data/site";

const IS_LIVE = import.meta.env.VITE_API_MODE === "live";
const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
const CACHE = "nk-content";
const TIMEOUT_MS = 2500;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE) ?? "null");
  } catch {
    return null;
  }
}

function writeCache(c) {
  try {
    localStorage.setItem(CACHE, JSON.stringify(c));
  } catch {
    // storage full or blocked: next visit just waits for the server again
  }
}

function apply(c) {
  try {
    applySiteContent(c);
    applyLegalContent(c.legal);
  } catch {
    // malformed section: keep whatever was applied so far
  }
}

export async function loadSiteContent() {
  if (!IS_LIVE) return;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(`${BASE}/content`, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(String(res.status));
    const { data } = await res.json();
    writeCache(data ?? {});
    apply(data ?? {});
  } catch {
    const cached = readCache();
    if (cached) apply(cached);
  }
}
