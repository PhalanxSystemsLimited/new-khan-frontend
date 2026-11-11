import { useEffect, useState } from "react";
import { IS_LIVE } from "./api";
import { useSession } from "./auth";
import { apiRequest } from "./live/liveApi";

/** The signed-in account's profile (GET /users/me), or null. One request per sign-in, shared by every caller. */
const cache = new Map(); // access token -> Promise<profile|null>

export function useMe() {
  const session = useSession();
  const token = session?.accessToken;
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!IS_LIVE || !token) return setMe(null);
    if (!cache.has(token)) cache.set(token, apiRequest("/users/me", { auth: true }).then((r) => r.data ?? null, () => null));
    let live = true;
    cache.get(token).then((r) => live && setMe(r));
    return () => {
      live = false;
    };
  }, [token]);
  return me;
}

/** Forget the cached profile, e.g. after a booking saved a CNIC to the account. */
export const refreshMe = () => cache.clear();

/** Role of the signed-in account ("customer", "agent", "admin", "super_admin"), or null. */
export function useRole() {
  return useMe()?.role ?? null;
}

/** Everyone who works for New Khan and has the admin panel (counter staff, driver, conductor, manager, admins). */
export const isStaffRole = (role) => ["agent", "driver", "conductor", "manager", "admin", "super_admin"].includes(role);
