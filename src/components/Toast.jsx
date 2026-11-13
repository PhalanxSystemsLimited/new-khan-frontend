import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Toast notifications. Call toast() from anywhere (components or plain functions):
 *   toast("Seats reserved", { body: "Pay within 10 minutes", kind: "success" })
 * kinds: success | error | info. <Toaster /> is drawn once in the layout, so a toast survives navigation
 * to the next page. Errors stay until dismissed; everything else closes itself after a few seconds.
 */

let items = [];
let nextId = 1;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function dismissToast(id) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(title, { body = "", kind = "success", duration } = {}) {
  const id = nextId++;
  // The same message twice in a row (a double click, a re-render) replaces the first instead of stacking.
  items = [...items.filter((t) => !(t.title === title && t.body === body)), { id, title, body, kind }].slice(-4);
  emit();
  const ms = duration ?? (kind === "error" ? 0 : 6000);
  if (ms > 0) setTimeout(() => dismissToast(id), ms);
  return id;
}

/** Shows a toast once per browser session for `key` (e.g. "Booking confirmed" for one booking). */
export function toastOnce(key, title, opts) {
  try {
    if (sessionStorage.getItem(`nk-toast-${key}`)) return;
    sessionStorage.setItem(`nk-toast-${key}`, "1");
  } catch {
    // storage blocked: show it anyway
  }
  toast(title, opts);
}

const useToasts = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );

const ICON = {
  success: { bg: "#15803d", path: "M6 12.5l4 4 8-9" },
  error: { bg: "#b91c1c", path: "M12 7v6m0 4h.01" },
  info: { bg: "#15181b", path: "M12 11v6m0-10h.01" },
};

function ToastItem({ t, lang }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const icon = ICON[t.kind] ?? ICON.info;
  return (
    <div
      role={t.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border-2 border-[#15181b] bg-white p-4 shadow-[4px_4px_0_#15181b] transition-all duration-300 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
    >
      <span aria-hidden className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: icon.bg }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon.path} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug text-black">{t.title}</p>
        {t.body && <p className="mt-0.5 text-sm leading-snug text-[#3a3f45]">{t.body}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        className="-me-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-[#545b62] hover:bg-[#eef0f2]"
        aria-label={lang === "ur" ? "بند کریں" : "Dismiss"}
      >
        ×
      </button>
    </div>
  );
}

/** Top-end on larger screens; across the top on phones (the sticky booking bar sits at the bottom). */
export function Toaster({ lang }) {
  const list = useToasts();
  const box = useRef(null);
  // An open form window (<dialog>) sits in the browser's top layer, above everything else on the page, so a
  // notification would be hidden behind it. Shown as a popover, the notifications go into the top layer too, and
  // are re-raised whenever one arrives so they stay above the window. Browsers without popovers: as before.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (list.length) el.showPopover();
    } catch {
      // never let a notification break the page
    }
  }, [list]);
  return (
    <div
      ref={box}
      popover="manual"
      aria-live="polite"
      className="no-print pointer-events-none fixed inset-x-3 top-3 bottom-auto z-[70] m-0 flex h-auto w-auto flex-col gap-3 overflow-visible border-0 bg-transparent p-0 sm:inset-x-auto sm:end-5 sm:top-5 sm:w-[24rem]"
    >
      {list.map((t) => (
        <ToastItem key={t.id} t={t} lang={lang} />
      ))}
    </div>
  );
}
