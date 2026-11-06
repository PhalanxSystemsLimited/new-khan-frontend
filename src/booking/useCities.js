import { useEffect, useState } from "react";
import { getCities, IS_LIVE } from "./api";
import { searchCities } from "../lib/routes";

let cached = IS_LIVE ? null : searchCities;
let loading = null;

/**
 * Cities for the search box. Mock mode: the site's own list (ids like "lahore").
 * Live mode: the backend's /cities (numeric ids), loaded once and shared.
 */
export function useCities() {
  const [list, setList] = useState(cached);
  useEffect(() => {
    if (cached) return;
    loading ??= getCities().then((c) => (cached = c)).catch(() => (loading = null, []));
    let live = true;
    loading.then((c) => live && setList(c));
    return () => {
      live = false;
    };
  }, []);
  return list;
}

/**
 * Resolve a city reference from a link to an id in the current list. Links on the site use slugs
 * ("lahore", "di-khan"); in live mode the ids are numbers, so fall back to matching the name.
 */
export function resolveCity(list, ref) {
  if (!ref || !list) return undefined;
  if (list.some((c) => c.id === ref)) return ref;
  const slugName = searchCities.find((c) => c.id === ref)?.name.en.toLowerCase();
  return list.find((c) => c.name.en.toLowerCase() === slugName)?.id;
}

export const lahoreId = (list) => list?.find((c) => c.name.en.toLowerCase() === "lahore")?.id;
