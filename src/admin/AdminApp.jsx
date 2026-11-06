/**
 * Admin panel at /admin (English only). Staff (agent) see daily operations; admins and super admins see
 * everything. The backend checks the role on every request too, so hiding a menu item is only a convenience.
 */
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { IS_LIVE } from "../booking/api";
import { signOut, useSession } from "../booking/auth";
import { AuthDialog } from "../booking/AuthDialog";
import { Toaster } from "../components/Toast";
import { adminApi } from "./api";
import { Btn } from "./ui";
import { Bookings, Dashboard, Refunds, Trips } from "./pages/Operations";
import { Fares, RoutesPage, Schedules } from "./pages/Network";
import { Buses, Drivers, Locations } from "./pages/Fleet";
import { Promos, RefundRules } from "./pages/Commercial";
import { Activity, Reports, Users } from "./pages/People";
import { Content } from "./pages/Content";

const STAFF = ["agent", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];

/** Menu: [path, label, admin only?, element]. */
const MENU = [
  ["Operations", [
    ["", "Dashboard", true, Dashboard],
    ["trips", "Trips & boarding", false, Trips],
    ["bookings", "Bookings", false, Bookings],
    ["refunds", "Refunds", true, Refunds],
  ]],
  ["Network", [
    ["routes", "Routes & stops", true, RoutesPage],
    ["fares", "Fares", true, Fares],
    ["schedules", "Schedules & trips", true, Schedules],
  ]],
  ["Fleet & places", [
    ["buses", "Buses", true, Buses],
    ["drivers", "Drivers", true, Drivers],
    ["locations", "Cities & terminals", true, Locations],
  ]],
  ["Sales rules", [
    ["promos", "Promo codes", true, Promos],
    ["refund-rules", "Refund rules", true, RefundRules],
  ]],
  ["People & reports", [
    ["users", "Users & staff", true, Users],
    ["reports", "Reports", true, Reports],
    ["activity", "Activity log", true, Activity],
  ]],
  ["Website", [["content", "Website content", true, Content]]],
];

function Gate({ children }) {
  const session = useSession();
  const [me, setMe] = useState(undefined); // undefined = loading, null = failed
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.title = "Admin · New Khan";
  }, []);

  useEffect(() => {
    if (!session) return setMe(null);
    setMe(undefined);
    adminApi.me().then(setMe, () => setMe(null));
  }, [session?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const box = (title, body, action) => (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 text-center">
        <img src="/new-khan-logo-2026.png" alt="New Khan" className="mx-auto h-12 w-auto" />
        <h1 className="mt-4 text-xl font-extrabold text-black">{title}</h1>
        <p className="mt-2 text-sm text-mute">{body}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      </div>
      <AuthDialog lang="en" open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );

  if (!IS_LIVE)
    return box("Admin panel is off in demo mode", "Build the website with VITE_API_MODE=live to use the admin panel.", <Link to="/en" className="btn btn-gold">Back to website</Link>);
  if (!session)
    return box("New Khan admin", "Sign in with a staff or admin account.", <Btn kind="primary" onClick={() => setAuthOpen(true)}>Sign in</Btn>);
  if (me === undefined) return box("Checking your account…", "One moment.", null);
  if (!me || !STAFF.includes(me.role))
    return box(
      "No access",
      me ? `${me.email ?? me.phone ?? "This account"} is a customer account. Ask a super admin to give it a staff role.` : "Your account could not be checked. Sign in again.",
      <>
        <Btn onClick={() => signOut()}>Sign out</Btn>
        <Link to="/en" className="btn btn-ghost">Back to website</Link>
      </>,
    );
  return children(me);
}

function Shell({ me }) {
  const isAdmin = ADMIN.includes(me.role);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const groups = MENU.map(([g, items]) => [g, items.filter((i) => isAdmin || !i[2])]).filter(([, items]) => items.length);
  const home = isAdmin ? "" : "trips";

  const nav = (
    <nav aria-label="Admin" className="grid gap-4">
      {groups.map(([g, items]) => (
        <div key={g}>
          <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500">{g}</p>
          {items.map(([p, label]) => (
            <NavLink
              key={p}
              to={`/admin${p ? `/${p}` : ""}`}
              end
              className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-semibold no-underline ${isActive ? "bg-black text-white" : "text-black hover:bg-neutral-200"}`}
            >
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-30 border-b-2 border-black bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border-2 border-black px-2 py-1 text-sm font-bold lg:hidden" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              Menu
            </button>
            <Link to="/admin" className="flex items-center gap-2 no-underline">
              <img src="/new-khan-logo-2026.png" alt="" className="h-8 w-auto" />
              <span className="font-extrabold text-black">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-neutral-700 sm:inline">
              {me.fullName || me.email} · <b>{me.role.replace("_", " ")}</b>
            </span>
            <Link to="/en" className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm">Website</Link>
            <Btn small onClick={() => signOut()}>Sign out</Btn>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[52px] z-20 max-h-[calc(100vh-52px)] overflow-y-auto border-b-2 border-black bg-white p-3 lg:sticky lg:block lg:h-[calc(100vh-52px)] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-e-2`}>
          {nav}
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Routes>
            {groups.flatMap(([, items]) => items).map(([p, , , El]) => (
              <Route key={p} path={p || "/"} element={<El me={me} isAdmin={isAdmin} />} />
            ))}
            <Route path="*" element={<Navigate to={`/admin${home ? `/${home}` : ""}`} replace />} />
          </Routes>
        </main>
      </div>
      <Toaster lang="en" />
    </div>
  );
}

export default function AdminApp() {
  return <Gate>{(me) => <Shell me={me} />}</Gate>;
}
