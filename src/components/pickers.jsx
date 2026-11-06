import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addDaysPKT, todayPKT } from "../booking/time";

/* ------------------------------------------------------------------ */
/* Shared popover: portal + fixed position, so no parent can clip it   */
/* ------------------------------------------------------------------ */

function Popover({ open, onClose, anchorRef, width, children, label }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const sheet = window.innerWidth < 640;
    const w = sheet ? window.innerWidth - 24 : width === "anchor" ? Math.max(r.width, 240) : width;
    const rtl = getComputedStyle(a).direction === "rtl";
    let left = rtl ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const h = box.current?.offsetHeight ?? 360;
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8; // flip above when there is no room below
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setPos({ top, left, w, sheet });
  }, [anchorRef, width]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const again = requestAnimationFrame(place); // second pass once the real height is known
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(again);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e) => {
      if (box.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const sheet = pos?.sheet ?? false;
  return createPortal(
    <>
      {sheet && <div aria-hidden className="fixed inset-0 z-[60] bg-black/45" />}
      <div
        ref={box}
        role="dialog"
        aria-label={label}
        dir={document.documentElement.dir}
        className={`z-[61] rounded-2xl border-2 border-black bg-white p-3 text-black shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] ${sheet ? "fixed inset-x-3 bottom-3 max-h-[80vh] overflow-auto" : "fixed"}`}
        style={sheet ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.w ?? undefined }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

const Chevron = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const triggerCls = (error) => `field flex w-full items-center justify-between gap-2 text-start ${error ? "!border-red-600" : ""}`;

const useMergedRef = (ref) => {
  const own = useRef(null);
  const set = (el) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
  return [own, set];
};

/* ------------------------------------------------------------------ */
/* City picker (select-only combobox: button + listbox)                */
/* ------------------------------------------------------------------ */

export const CityPicker = forwardRef(function CityPicker({ id, label, value, onChange, options, lang, placeholder, disabledId, error = false, describedBy }, ref) {
  const [own, setRefs] = useMergedRef(ref);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const typed = useRef({ s: "", t: 0 });
  const enabled = useMemo(() => options.map((o, i) => ({ o, i })).filter((x) => x.o.id !== disabledId), [options, disabledId]);
  const selected = options.find((o) => o.id === value);

  const openList = () => {
    const i = options.findIndex((o) => o.id === value);
    setActive(i >= 0 ? i : (enabled[0]?.i ?? 0));
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const pick = (i) => {
    const o = options[i];
    if (!o || o.id === disabledId) return;
    onChange(o.id);
    setOpen(false);
    own.current?.focus();
  };
  const move = (dir) => {
    const pos = enabled.findIndex((x) => x.i === active);
    const next = enabled[Math.max(0, Math.min(enabled.length - 1, pos + dir))];
    if (next) setActive(next.i);
  };

  function onKey(e) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); move(1); break;
      case "ArrowUp": e.preventDefault(); move(-1); break;
      case "Home": e.preventDefault(); setActive(enabled[0]?.i ?? 0); break;
      case "End": e.preventDefault(); setActive(enabled[enabled.length - 1]?.i ?? 0); break;
      case "Enter":
      case " ": e.preventDefault(); pick(active); break;
      case "Escape": e.preventDefault(); close(); break;
      case "Tab": close(); break;
      default:
        if (e.key.length === 1) {
          // type-ahead: jump to the next city starting with what was typed
          const now = Date.now();
          typed.current.s = now - typed.current.t > 700 ? e.key.toLowerCase() : typed.current.s + e.key.toLowerCase();
          typed.current.t = now;
          const hit = enabled.find((x) => x.o.name[lang].toLowerCase().startsWith(typed.current.s));
          if (hit) setActive(hit.i);
        }
    }
  }

  return (
    <>
      <button
        ref={setRefs}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${options[active]?.id}` : undefined}
        aria-label={`${label}: ${selected ? selected.name[lang] : placeholder}`}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKey}
        className={triggerCls(error)}
      >
        <span className={`flex min-w-0 items-center gap-2 ${selected ? "font-semibold text-black" : "text-mute"}`}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-gold-light"><path d="M12 21s6-5.6 6-10.5a6 6 0 1 0-12 0C6 15.4 12 21 12 21Zm0-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>
          <span className="truncate">{selected ? selected.name[lang] : placeholder}</span>
        </span>
        <span className="shrink-0 text-mute"><Chevron /></span>
      </button>
      <Popover open={open} onClose={close} anchorRef={own} width="anchor" label={label}>
        <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-auto">
          {options.map((o, i) => {
            const dis = o.id === disabledId;
            const on = o.id === value;
            return (
              <li
                key={o.id}
                id={`${listId}-${o.id}`}
                role="option"
                aria-selected={on}
                aria-disabled={dis || undefined}
                onPointerMove={() => !dis && setActive(i)}
                onClick={() => pick(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 ${dis ? "cursor-not-allowed opacity-40" : ""} ${active === i && !dis ? "bg-gold/25" : ""} ${on ? "font-bold" : ""}`}
              >
                <span>
                  {o.name[lang]}
                  {o.name.en === "Lahore" && <span className="ms-2 rounded bg-black px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-bright">{lang === "ur" ? "ہیڈ آفس" : "Head office"}</span>}
                </span>
                {on && <span aria-hidden className="text-gold-light">✓</span>}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
});

/* ------------------------------------------------------------------ */
/* Date picker (custom calendar)                                       */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
};
const addMonths = (s, n) => {
  const { y, m, d } = parse(s);
  const t = new Date(Date.UTC(y, m + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last));
};
const loc = (lang) => (lang === "ur" ? "ur-PK-u-nu-latn" : "en-GB");
const dateLabel = (s, lang, o) => new Intl.DateTimeFormat(loc(lang), { timeZone: "UTC", ...o }).format(new Date(`${s}T12:00:00Z`));

const T = {
  choose: { en: "Select date", ur: "تاریخ منتخب کریں" },
  prev: { en: "Previous month", ur: "پچھلا مہینہ" },
  next: { en: "Next month", ur: "اگلا مہینہ" },
  today: { en: "Today", ur: "آج" },
  tomorrow: { en: "Tomorrow", ur: "کل" },
};

export const DatePicker = forwardRef(function DatePicker({ id, label, value, onChange, min, lang, error = false, describedBy }, ref) {
  const [own, setRefs] = useMergedRef(ref);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [focused, setFocused] = useState("");
  const grid = useRef(null);
  const lo = min && (!today || min > today) ? min : today || min || "";
  const rtl = lang === "ur";

  useEffect(() => setToday(todayPKT()), []);

  const openCal = () => {
    setFocused(value && value >= lo ? value : lo || todayPKT());
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);
  const choose = (d) => {
    if (lo && d < lo) return;
    onChange(d);
    setOpen(false);
    own.current?.focus();
  };

  // keep keyboard focus on the focused day while the calendar is open
  useEffect(() => {
    if (!open) return;
    grid.current?.querySelector(`[data-date="${focused}"]`)?.focus();
  }, [open, focused]);

  const go = (next) => setFocused(lo && next < lo ? lo : next);
  function onGridKey(e) {
    const step = e.key === "ArrowLeft" ? (rtl ? 1 : -1) : e.key === "ArrowRight" ? (rtl ? -1 : 1) : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
    if (step) {
      e.preventDefault();
      go(addDaysPKT(focused, step));
      return;
    }
    const wd = (new Date(`${focused}T12:00:00Z`).getUTCDay() + 6) % 7;
    switch (e.key) {
      case "Home": e.preventDefault(); go(addDaysPKT(focused, -wd)); break;
      case "End": e.preventDefault(); go(addDaysPKT(focused, 6 - wd)); break;
      case "PageUp": e.preventDefault(); go(addMonths(focused, e.shiftKey ? -12 : -1)); break;
      case "PageDown": e.preventDefault(); go(addMonths(focused, e.shiftKey ? 12 : 1)); break;
      case "Escape": e.preventDefault(); close(); own.current?.focus(); break;
      case "Tab": close(); break;
      case "Enter":
      case " ": e.preventDefault(); choose(focused); break;
      default:
    }
  }

  const view = focused ? parse(focused) : parse(todayPKT());
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  const weekdays = Array.from({ length: 7 }, (_, i) => dateLabel(iso(2024, 0, 1 + i), lang, { weekday: "short" })); // 1 Jan 2024 is a Monday
  const monthTitle = dateLabel(iso(view.y, view.m, 1), lang, { month: "long", year: "numeric" });
  const prevDisabled = !!lo && addDaysPKT(iso(view.y, view.m, 1), -1) < lo;
  const tomorrow = today ? addDaysPKT(today, 1) : "";

  return (
    <>
      <button
        ref={setRefs}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value ? dateLabel(value, lang, { dateStyle: "full" }) : T.choose[lang]}`}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : openCal())}
        className={triggerCls(error)}
      >
        <span className={`flex min-w-0 items-center gap-2 ${value ? "font-semibold text-black" : "text-mute"}`}>
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-gold-light"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4m8-4v4" /></svg>
          <span className="truncate">{value ? dateLabel(value, lang, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : T.choose[lang]}</span>
        </span>
        <span className="shrink-0 text-mute"><Chevron /></span>
      </button>

      <Popover open={open} onClose={close} anchorRef={own} width={320} label={label}>
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <button type="button" aria-label={T.prev[lang]} disabled={prevDisabled} onClick={() => go(addMonths(focused, -1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/30 text-lg hover:bg-gold/20 disabled:opacity-30">{rtl ? "›" : "‹"}</button>
          <p className="text-base font-extrabold" aria-live="polite">{monthTitle}</p>
          <button type="button" aria-label={T.next[lang]} onClick={() => go(addMonths(focused, 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/30 text-lg hover:bg-gold/20">{rtl ? "‹" : "›"}</button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-mute" aria-hidden>
          {weekdays.map((w, i) => (<span key={i} className="py-1">{w}</span>))}
        </div>
        <div ref={grid} role="grid" aria-label={monthTitle} onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-1" dir={rtl ? "rtl" : "ltr"}>
          {cells.map((d, i) =>
            d === null ? (
              <span key={`b${i}`} />
            ) : (
              <button
                key={d}
                type="button"
                role="gridcell"
                data-date={d}
                tabIndex={d === focused ? 0 : -1}
                disabled={!!lo && d < lo}
                aria-selected={d === value}
                aria-current={d === today ? "date" : undefined}
                aria-label={dateLabel(d, lang, { dateStyle: "full" })}
                onClick={() => choose(d)}
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  d === value ? "bg-black text-gold-bright" : d === today ? "border-2 border-gold hover:bg-gold/25" : "hover:bg-gold/25"
                } disabled:cursor-not-allowed disabled:text-black/25 disabled:hover:bg-transparent`}
              >
                <span className="ltr">{parse(d).d}</span>
              </button>
            ),
          )}
        </div>
        <div className="mt-2 flex gap-2 border-t border-line pt-3">
          <button type="button" disabled={!today || (!!lo && today < lo)} onClick={() => choose(today)} className="btn btn-ghost !min-h-11 flex-1 !px-2 text-sm disabled:opacity-40">{T.today[lang]}</button>
          <button type="button" disabled={!tomorrow || (!!lo && tomorrow < lo)} onClick={() => choose(tomorrow)} className="btn btn-ghost !min-h-11 flex-1 !px-2 text-sm disabled:opacity-40">{T.tomorrow[lang]}</button>
        </div>
      </Popover>
    </>
  );
});
