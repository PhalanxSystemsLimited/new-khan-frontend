import { useSyncExternalStore } from "react";

/**
 * Session store for the live backend (Supabase tokens issued through the backend's /auth endpoints).
 * Kept in localStorage so a refresh doesn't sign the customer out, the same trade-off supabase-js makes.
 * The access token is short-lived; liveApi refreshes it with the refresh token when it is about to expire.
 */
const KEY = "nk-session";
const listeners = new Set();

let session = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return s?.accessToken && s?.refreshToken ? s : null;
  } catch {
    return null;
  }
})();

const emit = () => listeners.forEach((l) => l());

export function getSession() {
  return session;
}

export function setSession(s) {
  session = s?.accessToken ? { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt, user: s.user ?? null } : null;
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the session still lasts for this page view
  }
  emit();
}

export function clearSession() {
  setSession(null);
}

/** Signs out on the server (revokes the refresh token) and locally. */
export async function signOut() {
  const s = session;
  clearSession();
  if (!s) return;
  const { apiLogout } = await import("./live/liveApi");
  await apiLogout(s.accessToken).catch(() => {});
}

export function useSession() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => session,
    () => null,
  );
}
