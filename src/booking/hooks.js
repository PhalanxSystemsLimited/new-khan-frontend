import { useEffect, useState } from "react";

/** Re-renders every `ms`. Used for the live countdown (derived from absolute timestamps, so it survives refresh). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const bookUrl = (lang, page, params = {}) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== null) q.set(k, String(v));
  const s = q.toString();
  return `/${lang}/book/${page}${s ? `?${s}` : ""}`;
};
