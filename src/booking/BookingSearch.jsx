import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CityPicker, DatePicker } from "../components/pickers";
import { hasDirectBus, IS_LIVE, MAX_PAX } from "./api";
import { bookUrl } from "./hooks";
import { bt } from "./strings";
import { todayPKT } from "./time";
import { lahoreId, resolveCity, useCities } from "./useCities";

/** Search: one way / return, from, to (swap), dates, passengers. variant "bar" = one wide row on large screens. */
export function BookingSearch({ lang, initial = {}, compact = false, variant = "card", idp = "bs" }) {
  const navigate = useNavigate();
  const cities = useCities();
  const bar = variant === "bar";
  const [mode, setMode] = useState(initial.trip === "return" ? "return" : "oneway");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [date, setDate] = useState(initial.date ?? "");
  const [ret, setRet] = useState(initial.ret ?? "");
  const [pax, setPax] = useState(initial.pax ?? 1);
  const [today, setToday] = useState();
  const [errors, setErrors] = useState({});
  const refs = { from: useRef(null), to: useRef(null), date: useRef(null), ret: useRef(null) };

  useEffect(() => setToday(todayPKT()), []);
  // Default "from" to Lahore once the city list is known; map link slugs to ids in live mode.
  useEffect(() => {
    if (!cities) return;
    setFrom((f) => resolveCity(cities, f) ?? (f ? "" : lahoreId(cities) ?? ""));
    setTo((t) => resolveCity(cities, t) ?? "");
  }, [cities]);

  function validate() {
    const e = {};
    if (!from) e.from = bt("errPickFrom", lang);
    if (!to) e.to = bt("errPickTo", lang);
    else if (from === to) e.to = bt("errSame", lang);
    if (!date || (today && date < today)) e.date = bt("errDate", lang);
    if (mode === "return") {
      if (!ret) e.ret = bt("errReturnDate", lang);
      else if (date && ret < date) e.ret = bt("errReturnBefore", lang);
    }
    return e;
  }

  function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const first = ["from", "to", "date", "ret"].find((k) => e[k]);
    if (first) return refs[first].current?.focus();
    navigate(bookUrl(lang, "results", { from, to, date, ret: mode === "return" ? ret : undefined, pax, trip: mode }));
  }

  const err = (k) =>
    errors[k] ? (
      <p id={`${idp}-${k}-err`} role="alert" className="mt-1 text-sm text-red-700">{errors[k]}</p>
    ) : null;

  const options = cities ?? [];

  return (
    <form onSubmit={submit} noValidate className={bar ? "rounded-2xl border-2 border-black bg-white p-4 text-black shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)] sm:p-5" : "card !p-4 text-black sm:!p-5"} aria-label={bt("bookTitle", lang)}>
      <div role="radiogroup" aria-label={bt("bookTitle", lang)} className="mb-3 flex w-full rounded-xl border border-black p-1 sm:mb-4 sm:inline-flex sm:w-auto">
        {["oneway", "return"].map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold sm:flex-none ${mode === m ? "bg-black text-white" : "text-black hover:bg-black/5"}`}
          >
            {bt(m === "oneway" ? "oneWay" : "returnTrip", lang)}
          </button>
        ))}
      </div>

      <div className={bar ? "flex flex-col gap-3 lg:flex-row lg:items-end" : ""}>
        <div className={`grid max-sm:grid-cols-1 gap-x-2 gap-y-2.5 sm:gap-3 ${bar ? "lg:contents" : compact ? "" : "lg:grid-cols-[1fr_auto_1fr]"} sm:grid-cols-[1fr_auto_1fr]`}>
          <div className={`max-sm:row-start-1 ${bar ? "lg:min-w-0 lg:flex-1" : ""}`}>
            <label htmlFor={`${idp}-from`} className="label">{bt("from", lang)}</label>
            <CityPicker id={`${idp}-from`} ref={refs.from} label={bt("from", lang)} value={from} onChange={setFrom} options={options} lang={lang} placeholder={bt("chooseCity", lang)} disabledId={to} error={!!errors.from} describedBy={errors.from ? `${idp}-from-err` : undefined} />
            {err("from")}
          </div>
          <button
            type="button"
            onClick={() => { setFrom(to); setTo(from); }}
            aria-label={bt("swap", lang)}
            className={`btn btn-ghost max-sm:relative max-sm:z-10 max-sm:row-start-2 max-sm:-mb-8 max-sm:h-8 max-sm:justify-self-end max-sm:!min-h-0 max-sm:!rounded-full max-sm:!border max-sm:!px-3 max-sm:!py-0 max-sm:text-xs sm:!min-h-12 sm:!px-4 sm:mt-6 ${bar ? "lg:!mt-0 lg:shrink-0" : ""}`}
          >
            <span className="sm:hidden">⇅ {lang === "ur" ? "اُلٹ دیں" : "Swap"}</span><span className="hidden sm:inline">⇄</span>
          </button>
          <div className={`max-sm:row-start-3 ${bar ? "lg:min-w-0 lg:flex-1" : ""}`}>
            <label htmlFor={`${idp}-to`} className="label">{bt("to", lang)}</label>
            <CityPicker id={`${idp}-to`} ref={refs.to} label={bt("to", lang)} value={to} onChange={setTo} options={options} lang={lang} placeholder={bt("chooseCity", lang)} disabledId={from} error={!!errors.to} describedBy={errors.to ? `${idp}-to-err` : undefined} />
            {err("to")}
            {from && to && from !== to && !hasDirectBus(from, to) && <p className="mt-1 text-sm font-semibold text-gold-light">{bt("viaHint", lang)}</p>}
          </div>
        </div>

        <div className={`mt-2.5 grid gap-x-2 gap-y-2.5 sm:mt-3 sm:gap-3 ${bar ? "lg:contents" : ""} ${mode === "return" ? "max-sm:grid-cols-2 sm:grid-cols-3" : "max-sm:grid-cols-[minmax(0,1fr)_92px] sm:grid-cols-2"}`}>
          <div className={bar ? "lg:min-w-0 lg:flex-1" : ""}>
            <label htmlFor={`${idp}-date`} className="label">{bt("departDate", lang)}</label>
            <DatePicker id={`${idp}-date`} ref={refs.date} label={bt("departDate", lang)} value={date} onChange={(d) => { setDate(d); if (ret && ret < d) setRet(""); }} min={today} lang={lang} error={!!errors.date} describedBy={errors.date ? `${idp}-date-err` : undefined} />
            {err("date")}
          </div>
          {mode === "return" && (
            <div className={bar ? "lg:min-w-0 lg:flex-1" : ""}>
              <label htmlFor={`${idp}-ret`} className="label">{bt("returnDate", lang)}</label>
              <DatePicker id={`${idp}-ret`} ref={refs.ret} label={bt("returnDate", lang)} value={ret} onChange={setRet} min={date || today} lang={lang} error={!!errors.ret} describedBy={errors.ret ? `${idp}-ret-err` : undefined} />
              {err("ret")}
            </div>
          )}
          <div className={`${mode === "return" ? "max-sm:col-span-2" : ""} ${bar ? "lg:w-28 lg:shrink-0" : ""}`}>
            <label htmlFor={`${idp}-pax`} className="label">{bt("passengers", lang)}</label>
            <select id={`${idp}-pax`} className="field" value={pax} onChange={(e) => setPax(Number(e.target.value))}>
              {Array.from({ length: MAX_PAX }, (_, i) => i + 1).map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
        </div>

        <button type="submit" className={`btn btn-gold btn-shine mt-3 w-full text-lg sm:mt-4 sm:w-auto ${bar ? "lg:mt-0 lg:shrink-0 lg:px-8" : ""}`}>{bt("searchBuses", lang)}</button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-mute sm:mt-3 sm:text-xs">{bt(IS_LIVE ? "liveNote" : "placeholderNote", lang)}</p>
    </form>
  );
}

/** Search form prefilled from ?from=&to= (used by the route map's "Book" links). */
export function BookingSearchWithQuery({ lang }) {
  const [sp] = useSearchParams();
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  return <BookingSearch lang={lang} initial={{ from, to }} key={`${from}-${to}`} />;
}
