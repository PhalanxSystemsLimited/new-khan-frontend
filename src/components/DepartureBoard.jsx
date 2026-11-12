import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { searchTrips } from "../booking/api";
import { bookUrl } from "../booking/hooks";
import { addDaysPKT, fmtTime, pkr, todayPKT } from "../booking/time";
import { lahoreId, useCities } from "../booking/useCities";
import { company } from "../data/site";
import { href } from "../lib/links";
import { CountUp } from "./motion";

/** The letters on the drum of a split-flap board, in the order the flaps turn over. */
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.,-*";
const STEP = 62; // ms per flap

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One flap of a split-flap (Solari) board. It turns over one frame at a time: the top half of the old frame
 * folds down while the bottom half of the new one drops into place. In Urdu a whole word is one flap.
 */
function Flap({ frames, delay, word = false }) {
  const last = frames[frames.length - 1];
  const [s, setS] = useState({ cur: frames[0], prev: frames[0], n: 0 });
  const key = frames.join("\u0001");

  useEffect(() => {
    if (reduced() || frames.length < 2) {
      setS({ cur: last, prev: last, n: 0 });
      return;
    }
    const timers = [];
    frames.forEach((f, i) => {
      if (i === 0) return;
      timers.push(window.setTimeout(() => setS((o) => ({ cur: f, prev: o.cur, n: o.n + 1 })), delay + i * (word ? STEP * 2.4 : STEP)));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, delay]);

  return (
    <span aria-hidden className={word ? "flap flap-word" : "flap"}>
      <span className="flap-h flap-t">{s.cur}</span>
      <span className="flap-h flap-b">{s.prev}</span>
      {s.n > 0 && (
        <>
          <span key={`t${s.n}`} className="flap-h flap-t flap-fold">{s.prev}</span>
          <span key={`b${s.n}`} className="flap-h flap-b flap-drop">{s.cur}</span>
        </>
      )}
      <span className="invisible">{word ? last : "W"}</span>
    </span>
  );
}

/** A field of letter flaps, padded to a fixed width like a real board. */
function FlapText({ text, width, delay, align = "start", go }) {
  const t = text.toUpperCase().slice(0, width);
  const padded = align === "end" ? t.padStart(width, " ") : t.padEnd(width, " ");
  return (
    <span className="flap-row ltr">
      {[...padded].map((ch, i) => {
        let frames = [" "];
        if (go) {
          const at = DRUM.indexOf(ch);
          if (at <= 0) frames = [" ", ch];
          else {
            const from = Math.max(1, at - 6 - ((i * 7 + width) % 9));
            frames = [" ", ...DRUM.slice(from, at + 1)];
          }
        }
        return <Flap key={i} frames={frames} delay={delay + i * 38} />;
      })}
    </span>
  );
}

function FlapWord({ text, decoys, delay, go }) {
  return <Flap word frames={go ? ["", ...decoys, text] : [""]} delay={delay} />;
}

/**
 * "Leaving Lahore" board: on first view every flap turns over until the next five buses are spelled out
 * (time, destination, coach, fare, status). Each row opens the booking results for that bus.
 * Data comes from the booking API (mock placeholders, or the live backend).
 */
export function DepartureBoard({ lang }) {
  const cities = useCities();
  const [state, setState] = useState(null);
  const boardRef = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!cities) return;
    const from = lahoreId(cities);
    if (!from) return setState({ day: "today", trips: [] });
    let live = true;
    (async () => {
      for (const [day, offset] of [["today", 0], ["tomorrow", 1]]) {
        const date = addDaysPKT(todayPKT(), offset);
        const lists = await Promise.all(cities.filter((c) => c.id !== from).map((c) => searchTrips({ fromId: from, toId: c.id, date }).catch(() => [])));
        const trips = lists.flat().sort((a, b) => Date.parse(a.departAt) - Date.parse(b.departAt));
        if (trips.length) return live && setState({ day, trips });
      }
      if (live) setState({ day: "today", trips: [] });
    })();
    return () => {
      live = false;
    };
  }, [cities]);

  // The board spells itself out the first time it comes into view.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  const t = state?.trips ?? [];
  const next = t[0];
  const day = state?.day ?? "today";
  const dash = "–";
  const years = Number(todayPKT().slice(0, 4)) - company.founded;
  const L2 = (en, ur) => (lang === "ur" ? ur : en);
  const ur = lang === "ur";

  // Five buses, at most two per departure time, so the board shows a spread of the day.
  const rows = t.reduce((acc, x) => (acc.length < 5 && acc.filter((y) => y.departAt === x.departAt).length < 2 ? [...acc, x] : acc), []);
  const go = seen && state !== null;
  const timeOf = (x) => fmtTime(x.departAt, "en").replace(/\s/g, " ");
  const destW = Math.max(8, ...rows.map((x) => x.toName.en.length));
  const fareOf = (x) => x.fare.toLocaleString("en-US");
  const statusOf = (x) => (now !== null && Date.parse(x.departAt) - Date.parse(now) <= 30 * 60_000 ? "boarding" : "on time");
  const placeholders = state === null || rows.length ? Math.max(0, 5 - rows.length) : 0;
  const allNames = rows.map((x) => x.toName.ur);
  const rowDelay = (i) => 250 + i * 420;

  return (
    <section className="border-b-4 border-gold bg-[#0e1013] text-white" aria-label={L2("Leaving Lahore", "لاہور سے روانگی")}>
      <div className="container-nk py-6 sm:py-8">
        {/* Board header: the station sign and a live clock */}
        <div className="nk-board-head flex items-center justify-between gap-4">
          <p className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.25em] text-gold-bright">
            <span aria-hidden className="relative flex h-2.5 w-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-green-400/70 motion-reduce:hidden" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-green-400" />
            </span>
            {L2("Leaving Lahore", "لاہور سے روانگی")}
            <span className="font-normal tracking-[0.15em] text-white/50">· {day === "today" ? L2("Today", "آج") : L2("Tomorrow", "کل")}</span>
          </p>
          <p className="font-mono text-lg font-bold text-[#c5ccd3] sm:text-xl">
            <span className={ur ? "" : "ltr"}>{now ? fmtTime(now, lang) : "--:--"}</span>
          </p>
        </div>

        {/* The board: a dark housing with the flaps set into it */}
        <div ref={boardRef} className="flapboard mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#15181b,#0f1113)] p-2 shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] sm:p-3">
          <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] gap-x-5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45 md:grid">
            <span className="w-[calc(8*var(--fw))]">{L2("Time", "وقت")}</span>
            <span>{L2("Destination", "منزل")}</span>
            <span className="w-[calc(2*var(--fw))]">{L2("Coach", "بس")}</span>
            <span className="w-[calc(7*var(--fw))]">{L2("Fare Rs", "کرایہ")}</span>
            <span className="w-[calc(8*var(--fw))]">{L2("Status", "صورتحال")}</span>
          </div>
          <ol className="flex flex-col gap-1.5">
            {state !== null && rows.length === 0 && (
              <li className="px-3 py-5 text-sm text-white/60">{L2("No more buses today. Book for tomorrow.", "آج مزید بسیں نہیں۔ کل کے لیے بُک کریں۔")}</li>
            )}
            {rows.map((x, i) => {
              const d = rowDelay(i);
              const status = statusOf(x);
              const label = ur
                ? `${fmtTime(x.departAt, lang)}، ${x.toName.ur}، ${pkr(x.fare)}`
                : `${fmtTime(x.departAt, lang)}, ${x.toName.en}, AC, ${pkr(x.fare)}, ${status}`;
              return (
                <li key={x.id}>
                  <Link
                    to={bookUrl(lang, "results", { from: x.fromId, to: x.toId, date: x.date, pax: 1, trip: "oneway" })}
                    aria-label={label}
                    className="flapboard-row group grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04] md:grid-cols-[auto_1fr_auto_auto_auto] md:gap-x-5"
                  >
                    {ur ? (
                      <>
                        <span className="text-[#f5c451]"><FlapWord text={fmtTime(x.departAt, lang)} decoys={["—", "—"]} delay={d} go={go} /></span>
                        <span className="min-w-0"><FlapWord text={x.toName.ur} decoys={allNames.filter((n) => n !== x.toName.ur).slice(0, 3)} delay={d + 120} go={go} /></span>
                        <span className="hidden md:block"><FlapText text="AC" width={2} delay={d + 260} go={go} /></span>
                        <span className="col-start-2 text-[12px] font-semibold text-white/55 md:hidden">
                          <span className="ltr font-bold text-white/85">{pkr(x.fare)}*</span> · اے سی · <span className={status === "boarding" ? "text-green-400" : ""}>{status === "boarding" ? "سوار ہوں" : "وقت پر"}</span>
                        </span>
                        <span className="hidden md:block"><FlapText text={fareOf(x)} width={7} align="end" delay={d + 320} go={go} /></span>
                        <span className={`hidden md:block ${status === "boarding" ? "text-green-400" : "text-white/70"}`}>
                          <FlapWord text={status === "boarding" ? "سوار ہوں" : "وقت پر"} decoys={["—"]} delay={d + 400} go={go} />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#f5c451]"><FlapText text={timeOf(x)} width={8} align="end" delay={d} go={go} /></span>
                        <span className="min-w-0"><FlapText text={x.toName.en} width={destW} delay={d + 120} go={go} /></span>
                        <span className="col-start-2 text-[11px] font-semibold uppercase tracking-wider text-white/55 md:hidden">
                          <span className="ltr font-bold text-white/85">{pkr(x.fare)}*</span> · AC · <span className={status === "boarding" ? "text-green-400" : ""}>{status}</span>
                        </span>
                        <span className="hidden md:block"><FlapText text="AC" width={2} delay={d + 260} go={go} /></span>
                        <span className="hidden md:block"><FlapText text={fareOf(x)} width={7} align="end" delay={d + 320} go={go} /></span>
                        <span className={`hidden md:block ${status === "boarding" ? "text-green-400" : "text-white/70"}`}>
                          <FlapText text={status} width={8} delay={d + 400} go={go} />
                        </span>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
            {/* Blank flaps while the timetable loads, so the board is there from the first moment */}
            {Array.from({ length: placeholders }, (_, i) => (
              <li key={`blank${i}`} aria-hidden className="grid grid-cols-[auto_1fr] items-center gap-x-3 px-2 py-1.5 md:grid-cols-[auto_1fr_auto_auto_auto] md:gap-x-5">
                <FlapText text="" width={8} delay={0} go={false} />
                <FlapText text="" width={ur ? 8 : destW} delay={0} go={false} />
                <span className="hidden md:block"><FlapText text="" width={2} delay={0} go={false} /></span>
                <span className="hidden md:block"><FlapText text="" width={7} delay={0} go={false} /></span>
                <span className="hidden md:block"><FlapText text="" width={8} delay={0} go={false} /></span>
              </li>
            ))}
          </ol>
        </div>

        {/* The headline figures, one quiet line under the board */}
        <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/60">
          <div className="flex items-baseline gap-1.5">
            <dd className="font-bold text-gold-bright">{state ? t.length : dash}</dd>
            <dt>{day === "today" ? L2("buses left today", "آج کی باقی بسیں") : L2("buses tomorrow", "کل کی بسیں")}</dt>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt>{L2("Fares from", "کم از کم کرایہ")}</dt>
            <dd className="ltr font-bold text-gold-bright">{t.length ? `${pkr(Math.min(...t.map((x) => x.fare)))}*` : dash}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dd className="font-bold text-gold-bright"><CountUp to={years} /></dd>
            <dt>{L2("years on the road", "سال سے سڑک پر")}</dt>
          </div>
          <Link to={href(lang, "/book")} className="ms-auto font-semibold text-gold-bright underline underline-offset-4">
            {L2("All departures", "تمام روانگیاں")} {ur ? "←" : "→"}
          </Link>
        </dl>
        <p className="sr-only" aria-live="polite">{next ? (ur ? `اگلی بس: ${next.toName.ur} کے لیے، ${fmtTime(next.departAt, lang)}` : `Next bus: ${fmtTime(next.departAt, lang)} ${next.toName.en}`) : ""}</p>
      </div>
    </section>
  );
}
