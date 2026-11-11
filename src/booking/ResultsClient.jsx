import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { busTypes } from "../data/site";
import { arrow } from "../lib/links";
import { hasDirectBus, IS_LIVE, searchItineraries } from "./api";
import { BookingSearch } from "./BookingSearch";
import { bookUrl } from "./hooks";
import { bt } from "./strings";
import { fmtDate, fmtTime, pkr, pktHour } from "./time";
import { useCities } from "./useCities";

const slotOf = (iso) => {
  const h = pktHour(iso);
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night";
};

const hm = (mins, lang) => {
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return lang === "ur" ? `${h} گھنٹے${r ? ` ${r} منٹ` : ""}` : `${h}h${r ? ` ${r}m` : ""}`;
};
const dur = (a, b, lang) => hm(Math.round((Date.parse(b) - Date.parse(a)) / 60000), lang);
const star = IS_LIVE ? "" : "*";

const chip = (active) => `min-h-11 rounded-full border px-4 text-sm font-semibold ${active ? "border-black bg-black text-white" : "border-black/40 text-black hover:bg-black/5"}`;

function useItineraries(fromId, toId, date) {
  const [load, setLoad] = useState({ state: "loading" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!date) return;
    let live = true;
    setLoad({ state: "loading" });
    searchItineraries({ fromId, toId, date })
      .then((items) => live && setLoad({ state: "ok", items }))
      .catch((e) => live && setLoad({ state: "error", msg: e.message }));
    return () => {
      live = false;
    };
  }, [fromId, toId, date, n]);
  return [load, () => setN((x) => x + 1)];
}

const nameIn = (cities, id, lang) => cities?.find((c) => c.id === id)?.name[lang] ?? id;

/** AC = black and silver; a trip mixing bus types gets a neutral card. */
const tone = {
  ac: {
    card: "border-2 border-gold bg-black text-white shadow-[0_10px_30px_-12px_rgba(120,128,136,0.6)]",
    text: "text-white",
    mute: "text-white/70",
    price: "text-gold-bright",
    badge: "bg-gold text-black",
    line: "bg-gold/60",
    btn: "bg-gold text-black hover:bg-[#b3bbc3]",
    btnOn: "bg-white text-black",
    ring: "ring-4 ring-gold/60",
  },
  mixed: {
    card: "border-2 border-line bg-coal",
    text: "text-black",
    mute: "text-mute",
    price: "text-gold-light",
    badge: "border border-black bg-white text-black",
    line: "bg-gold/50",
    btn: "bg-black text-white hover:bg-neutral-800",
    btnOn: "bg-gold text-black",
    ring: "ring-4 ring-gold/40",
  },
};

/** One bus, or two buses joined by a layover in Lahore. */
function ItineraryCard({ it, lang, selected, onSelect }) {
  const first = it.legs[0];
  const last = it.legs[it.legs.length - 1];
  const low = it.seatsLeft <= 6;
  const multi = it.legs.length > 1;
  const kinds = new Set(it.legs.map((t) => t.busType));
  const kind = kinds.size === 1 && tone[first.busType] ? first.busType : "mixed";
  const c = tone[kind];
  const typeName = (id) => busTypes.find((b) => b.id === id)?.name[lang] ?? id;
  const seatsText = it.seatsLeft === 0 ? bt("booked", lang) : low ? bt("lowSeats", lang, { n: it.seatsLeft }) : bt("seatsLeft", lang, { n: it.seatsLeft });
  return (
    <li className={`rounded-2xl p-4 sm:p-5 ${c.card} ${selected ? c.ring : ""}`}>
      {/* top: bus type + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {kind !== "mixed" && <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest ${c.badge}`}>{typeName(kind)}</span>}
          {multi && <span className="rounded-full bg-gold/30 px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-gold-light">{bt("connection", lang)}</span>}
        </div>
        <div className="shrink-0 text-end">
          <p className={`ltr text-2xl font-bold leading-none sm:text-3xl ${c.price}`}>{pkr(it.fare)}<sup>{star}</sup></p>
          <p className={`mt-1 text-xs ${c.mute}`}>{bt("perSeat", lang)}</p>
        </div>
      </div>

      {/* times */}
      <div className="mt-2">
        {it.legs.map((t, i) => (
          <div key={t.id}>
            {i > 0 && (
              <p className="my-2 flex items-center gap-2 text-sm font-semibold text-gold-light">
                <span aria-hidden className={`h-px flex-1 ${c.line}`} />⏱ {bt("layoverIn", lang, { time: hm(it.layoverMin[i - 1], lang), city: t.fromName[lang] })}
                <span aria-hidden className={`h-px flex-1 ${c.line}`} />
              </p>
            )}
            <p className={`ltr whitespace-nowrap text-[22px] font-bold leading-tight sm:text-2xl ${c.text}`}>
              {fmtTime(t.departAt, lang)} <span className={`text-lg ${c.mute}`}>{arrow(lang)}</span> {fmtTime(t.arriveAt, lang)}
            </p>
            {t.onRoute && (
              <p className="my-1 inline-block rounded-full bg-gold/30 px-3 py-0.5 text-xs font-bold text-gold-light">
                {bt("onRoute", lang, { city: t.onRoute.city[lang], time: fmtTime(t.onRoute.at, lang) })}
              </p>
            )}
            <p className={`text-sm ${c.mute}`}>
              {(multi || IS_LIVE) && `${t.fromName[lang]} ${arrow(lang)} ${t.toName[lang]} · `}
              {dur(t.departAt, t.arriveAt, lang)}
              {kind === "mixed" && ` · ${typeName(t.busType)}`}
            </p>
          </div>
        ))}
        {multi && <p className={`text-sm ${c.mute}`}>{bt("totalJourney", lang, { time: dur(first.departAt, last.arriveAt, lang) })}</p>}
      </div>

      {kind !== "mixed" && (
        <p className={`mt-2 text-xs sm:text-sm ${c.mute}`}>
          {busTypes.find((b) => b.id === kind).features.slice(0, 4).map((f) => f[lang]).join(" · ")}
        </p>
      )}

      {/* bottom: seats left + select */}
      <div className={`mt-3 flex items-center justify-between gap-3 border-t pt-3 ${kind === "ac" ? "border-white/15" : "border-black/10"}`}>
        <p className={`text-sm font-semibold ${low ? "text-red-500" : kind === "ac" ? "text-green-400" : "text-green-800"}`}>{seatsText}</p>
        <button type="button" onClick={onSelect} disabled={it.seatsLeft === 0} aria-pressed={selected} className={`btn !min-h-11 shrink-0 px-6 ${selected ? c.btnOn : c.btn} disabled:opacity-40`}>
          {selected ? `✓ ${bt("selected", lang)}` : bt("select", lang)}
        </button>
      </div>
    </li>
  );
}

function Section({ title, from, to, date, lang, selectedId, onSelect, cities, matchSlot, notBefore }) {
  // Each journey has its own filters: a morning outbound does NOT force a morning return.
  const [slot, setSlot] = useState("any");
  const [load, reload] = useItineraries(from, to, date);
  const list = useMemo(
    () =>
      load.state === "ok"
        ? load.items.filter((it) => (slot === "any" || slotOf(it.legs[0].departAt) === slot) && (!notBefore || Date.parse(it.legs[0].departAt) > Date.parse(notBefore)))
        : [],
    [load, slot, notBefore],
  );
  const connecting = !hasDirectBus(from, to);
  return (
    <section aria-labelledby={`h-${from}-${to}`} className="mt-8">
      {/* One-way: the route is the heading (the page title already says "Choose your bus"). */}
      <h2 id={`h-${from}-${to}`} className="h2">{title ?? `${nameIn(cities, from, lang)} ${arrow(lang)} ${nameIn(cities, to, lang)}`}</h2>
      <p className="mt-1 text-mute">
        {title && `${nameIn(cities, from, lang)} ${arrow(lang)} ${nameIn(cities, to, lang)} · `}
        {fmtDate(`${date}T12:00:00+05:00`, lang)}
      </p>
      {connecting && <p className="mt-4 rounded-xl border border-gold/60 bg-gold/10 p-3 text-sm text-black">{bt("viaNote", lang, { a: nameIn(cities, from, lang), b: nameIn(cities, to, lang) })}</p>}
      <div className="mt-4 space-y-3">
        <fieldset className="min-w-0">
          <legend className="label">{bt("timeOfDay", lang)}</legend>
          {/* one swipeable row on phones */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {["any", "morning", "afternoon", "evening", "night"].map((x) => (
              <button key={x} type="button" aria-pressed={slot === x} onClick={() => setSlot(x)} className={`${chip(slot === x)} shrink-0`}>{bt(x, lang)}</button>
            ))}
          </div>
          {matchSlot && (
            <button type="button" onClick={() => setSlot(matchSlot)} aria-pressed={slot === matchSlot} className="mt-2 min-h-11 text-sm font-semibold text-gold-light underline underline-offset-4">
              {bt("sameTime", lang, { slot: bt(matchSlot, lang) })}
            </button>
          )}
        </fieldset>
        {slot !== "any" && (
          <button type="button" onClick={() => setSlot("any")} className="min-h-11 text-sm font-semibold text-gold-light underline underline-offset-4">{bt("clearFilters", lang)}</button>
        )}
        {notBefore && <p className="text-sm text-mute">{bt("sameDayNote", lang)}</p>}
      </div>
      {load.state === "loading" && <p role="status" className="mt-4 text-mute">{bt("loading", lang)}</p>}
      {load.state === "error" && (
        <div role="alert" className="card mt-4 border-red-300">
          <p className="font-semibold text-red-800">{bt("loadFailed", lang)}</p>
          <p className="mt-1 text-sm text-mute">{load.msg}</p>
          <button type="button" onClick={reload} className="btn btn-ghost mt-3">{bt("retry", lang)}</button>
        </div>
      )}
      {load.state === "ok" && list.length === 0 && (
        <div className="card mt-4 text-center">
          <p className="text-lg font-semibold text-black">{bt("noResults", lang)}</p>
          <p className="mt-1 text-mute">{bt("noResultsHelp", lang)}</p>
        </div>
      )}
      {load.state === "ok" && list.length > 0 && (
        <ul className="mt-5 space-y-4">
          {list.map((it) => (
            <ItineraryCard key={it.id} it={it} lang={lang} selected={selectedId === it.id} onSelect={() => onSelect(it)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ResultsClient({ lang }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const cities = useCities();
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const date = sp.get("date");
  const ret = sp.get("ret");
  const pax = Math.min(6, Math.max(1, Number(sp.get("pax") ?? 1)));
  const isReturn = sp.get("trip") === "return" && !!ret;
  const [out, setOut] = useState(null);
  const [back, setBack] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  const total = ((out?.fare ?? 0) + (back?.fare ?? 0)) * pax;
  const ready = !!out && (!isReturn || !!back);

  if (!from || !to || !date) {
    return (
      <div className="card mt-6 text-center">
        <p className="text-lg font-semibold text-black">{bt("noResults", lang)}</p>
        <Link to={`/${lang}/book`} className="btn btn-gold mt-4">{bt("searchAgain", lang)}</Link>
      </div>
    );
  }

  const ids = (it) => it.legs.map((t) => t.id).join(",");
  const go = () => navigate(bookUrl(lang, "seats", { out: ids(out), ret: isReturn ? ids(back) : undefined, pax }));

  return (
    <div className="pb-40">
      <button type="button" onClick={() => setShowSearch((s) => !s)} aria-expanded={showSearch} className="btn btn-ghost mt-4 !min-h-11 text-sm">{bt("changeSearch", lang)}</button>
      {showSearch && (
        <div className="mt-3">
          <BookingSearch lang={lang} initial={{ from, to, date, ret: ret ?? "", pax, trip: isReturn ? "return" : "oneway" }} />
        </div>
      )}

      <Section title={isReturn ? bt("chooseOut", lang) : null} from={from} to={to} date={date} lang={lang} selectedId={out?.id ?? null} onSelect={(t) => { setOut(t); setBack(null); }} cities={cities} />

      {isReturn &&
        (out ? (
          <Section
            title={bt("chooseReturn", lang)}
            from={to}
            to={from}
            date={ret}
            lang={lang}
            selectedId={back?.id ?? null}
            onSelect={setBack}
            cities={cities}
            matchSlot={slotOf(out.legs[0].departAt)}
            notBefore={ret === date ? out.legs[out.legs.length - 1].arriveAt : undefined}
          />
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-black/30 p-4 text-mute">{bt("pickOutFirst", lang)}</p>
        ))}

      {/* Sticky trip summary */}
      <aside aria-label={bt("tripSummary", lang)} className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-gold bg-white/97 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur">
        <div className="container-nk flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className="truncate text-mute">
              {pax} {lang === "ur" ? "مسافر" : pax === 1 ? "passenger" : "passengers"} ·{" "}
              {out ? `${bt("outbound", lang)} ${fmtTime(out.legs[0].departAt, lang)}${out.legs.length > 1 ? ` (${bt("viaLahore", lang)})` : ""}` : bt("pickOutFirst", lang)}
              {isReturn && back ? ` · ${bt("returnLeg", lang)} ${fmtTime(back.legs[0].departAt, lang)}${back.legs.length > 1 ? ` (${bt("viaLahore", lang)})` : ""}` : isReturn && out ? ` · ${bt("pickReturnNext", lang)}` : ""}
            </p>
            <p className="ltr text-lg font-bold text-black sm:text-xl">
              {bt("total", lang)} {pkr(total)}<sup>{star}</sup>
            </p>
          </div>
          <button type="button" onClick={go} disabled={!ready} className="btn btn-gold shrink-0 disabled:opacity-40">{bt("continue", lang)}</button>
        </div>
      </aside>
    </div>
  );
}
