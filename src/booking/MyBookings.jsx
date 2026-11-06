import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { IS_LIVE, listMyBookings, markExpirySeen } from "./api";
import { useSession } from "./auth";
import { AuthDialog } from "./AuthDialog";
import { BookingCard } from "./BookingList";
import { arrow } from "../lib/links";
import { u } from "../lib/i18n";
import { bt } from "./strings";
import { fmtDate, fmtTime } from "./time";

/** Only reservations that ran out in the last week get the pop-up; older ones are just left out of the list. */
const NOTICE_WINDOW_MS = 7 * 24 * 3_600_000;

/** How many bookings the default (recent) view shows. */
const RECENT = 10;
const DAY_MS = 24 * 3_600_000;
const chip = (active) => `min-h-11 rounded-full border px-4 text-sm font-semibold ${active ? "border-black bg-black text-white" : "border-black/40 text-black hover:bg-black/5"}`;

const holdOver = (b, now) => Boolean(b.holdExpiresAt) && Date.parse(b.holdExpiresAt) <= now;
/** An unpaid reservation whose time is up (the server may not have marked it expired yet). */
const lapsed = (b, now) => !b.paymentReceived && (b.status === "EXPIRED" || (b.status === "HELD" && holdOver(b, now)));

/**
 * "Your reservation expired" pop-up. Shown once per booking per account: closing it records that on the
 * server (live) or in this browser (demo), so the customer is not told again on any device.
 */
function ExpiredNotice({ lang, list }) {
  const dlg = useRef(null);
  const [done, setDone] = useState(() => new Set());
  const now = Date.now();
  const items = (list ?? []).filter(
    (b) => lapsed(b, now) && !b.expirySeen && !done.has(b.key) && b.holdExpiresAt && now - Date.parse(b.holdExpiresAt) < NOTICE_WINDOW_MS,
  );
  const show = items.length > 0;

  useEffect(() => {
    if (show && !dlg.current?.open) dlg.current?.showModal();
  }, [show]);

  const close = () => {
    const keys = items.map((b) => b.key);
    setDone((d) => new Set([...d, ...keys]));
    dlg.current?.close();
    if (keys.length) markExpirySeen(keys).catch(() => {}); // not saved: it is shown once more next time
  };

  const many = items.length > 1;
  return (
    <dialog
      ref={dlg}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="exp-pop-t"
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border-2 border-black p-6 backdrop:bg-black/60"
      dir={lang === "ur" ? "rtl" : "ltr"}
    >
      <p aria-hidden className="text-3xl">⏱</p>
      <h2 id="exp-pop-t" className="h3 mt-2 text-black">
        {many ? bt("expiredPopTitleMany", lang, { n: items.length }) : bt("expiredPopTitle", lang)}
      </h2>
      <ul className="mt-3 grid gap-2">
        {items.map((b) => (
          <li key={b.key} className="rounded-xl border border-line bg-coal px-3 py-2 text-sm">
            <p className="ltr font-mono font-bold text-black">{b.ref}</p>
            <p className="font-semibold text-black">
              {b.fromName[lang]} {arrow(lang)} {b.toName[lang]}
            </p>
            <p className="text-mute">
              {b.departAt && (
                <>
                  {fmtDate(b.departAt, lang)} · <span className="ltr">{fmtTime(b.departAt, lang)}</span>
                </>
              )}
              {b.seats.length > 0 && <> · {bt("seatsList", lang, { list: b.seats.join(", ") })}</>}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-mute">{many ? bt("expiredPopBodyMany", lang) : bt("expiredPopBody", lang)}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={`/${lang}/book`} onClick={close} className="btn btn-gold">{bt("bookAgain", lang)}</Link>
        <button type="button" autoFocus onClick={close} className="btn btn-ghost">{bt("gotIt", lang)}</button>
      </div>
    </dialog>
  );
}

/** A trip that is still on (held and in time, or confirmed) and leaves within the next 24 hours. */
const inNext24h = (b, now) => {
  if (!b.departAt || lapsed(b, now) || (b.status !== "HELD" && b.status !== "CONFIRMED")) return false;
  const t = Date.parse(b.departAt);
  return t >= now && t <= now + DAY_MS;
};

/**
 * My bookings: the signed-in customer's bookings (live) or this browser's (demo). Reloads when the page is
 * opened, when the customer signs in, when they come back to the tab, and when a countdown reaches zero.
 *
 * - Recent (default): the latest bookings. Reservations waiting for payment are pinned on top with their
 *   countdown and Pay now; reservations that ran out unpaid are left out (the pop-up above tells the customer once).
 * - View all (?view=all): every booking on the account, including cancelled and expired ones, newest first.
 * - Next 24 hours pill (?when=24h): only trips leaving in the next 24 hours, soonest first, searched across the
 *   whole account so an old booking for tomorrow's bus still shows.
 */
export function MyBookings({ lang }) {
  const session = useSession();
  const needsSignIn = IS_LIVE && !session;
  const [sp, setSp] = useSearchParams();
  const showAll = sp.get("view") === "all";
  const soon = sp.get("when") === "24h";
  const setParam = (k, v) =>
    setSp((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    if (needsSignIn) return;
    setBusy(true);
    try {
      setList(await listMyBookings());
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }, [needsSignIn]);

  useEffect(() => {
    load();
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  if (needsSignIn)
    return (
      <div className="card mt-6 max-w-xl">
        <p className="text-black">{bt("signInForMine", lang)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => setAuthOpen(true)} className="btn btn-gold">{lang === "ur" ? "سائن ان" : "Sign in"}</button>
          <Link to={`/${lang}/book/manage`} className="btn btn-ghost">{bt("manageLink", lang)}</Link>
        </div>
        <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
      </div>
    );

  const now = Date.now();
  const all = list ?? [];
  const visible = all.filter((b) => !lapsed(b, now));
  const held = visible
    .filter((b) => b.status === "HELD")
    .sort((a, b) => Date.parse(a.holdExpiresAt ?? 0) - Date.parse(b.holdExpiresAt ?? 0)); // ending soonest first
  const recent = [...held, ...visible.filter((b) => b.status !== "HELD")];
  const upcoming = all.filter((b) => inNext24h(b, now)).sort((a, b) => Date.parse(a.departAt) - Date.parse(b.departAt));

  let rows = null;
  if (list !== null) rows = soon ? upcoming : showAll ? [...held, ...all.filter((b) => !held.includes(b))] : recent.slice(0, RECENT);
  const more = !soon && !showAll && all.length > rows?.length; // something is hidden from the recent view

  const intro = soon ? "next24Intro" : showAll ? "allBookingsIntro" : IS_LIVE ? "myBookingsIntro" : "myBookingsIntroDemo";

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={bt("filterBookings", lang)}>
          <button type="button" aria-pressed={!soon && !showAll} onClick={() => setSp({})} className={chip(!soon && !showAll)}>
            {bt("recentPill", lang)}
          </button>
          <button type="button" aria-pressed={showAll && !soon} onClick={() => setSp({ view: "all" })} className={chip(showAll && !soon)}>
            {bt("allPill", lang)}{list !== null && ` (${all.length})`}
          </button>
          <button type="button" aria-pressed={soon} onClick={() => setParam("when", soon ? null : "24h")} className={chip(soon)}>
            {bt("next24Pill", lang)}{list !== null && ` (${upcoming.length})`}
          </button>
        </div>
        <button type="button" onClick={load} disabled={busy} className="btn btn-ghost !min-h-11 !py-2 text-sm">
          {busy ? bt("loading", lang) : bt("refresh", lang)}
        </button>
      </div>
      <p className="mt-3 text-mute" aria-live="polite">{bt(intro, lang)}</p>

      {err && (
        <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-900">
          {err}
        </p>
      )}

      {list === null && !err && <p role="status" className="mt-6 text-mute">{bt("loading", lang)}</p>}

      {rows?.length === 0 &&
        (soon ? (
          <div className="card mt-6 text-center">
            <h2 className="h3 text-black">{bt("noneNext24", lang)}</h2>
            <button type="button" onClick={() => setParam("when", null)} className="btn btn-ghost mt-4">{bt("clearFilter", lang)}</button>
          </div>
        ) : (
          <div className="card mt-6 text-center">
            <h2 className="h3 text-black">{bt("noBookings", lang)}</h2>
            <p className="mt-1 text-mute">{bt("noBookingsHelp", lang)}</p>
            <Link to={`/${lang}/book`} className="btn btn-gold mt-4">{u("book", lang)}</Link>
          </div>
        ))}

      {rows?.length > 0 && (
        <ul className="mt-5 grid gap-4">
          {rows.map((b) => (
            <BookingCard key={b.key} b={b} lang={lang} onExpire={load} />
          ))}
        </ul>
      )}

      {more && (
        <button type="button" onClick={() => setSp({ view: "all" })} className="btn btn-ghost mt-5 w-full sm:w-auto">
          {bt("viewAllBookings", lang, { n: all.length })}
        </button>
      )}

      <p className="mt-6 text-sm">
        <Link to={`/${lang}/book/manage`} className="font-semibold text-gold-light underline underline-offset-4">{bt("findByPhoneLink", lang)}</Link>
      </p>

      <ExpiredNotice lang={lang} list={list} />
    </div>
  );
}
