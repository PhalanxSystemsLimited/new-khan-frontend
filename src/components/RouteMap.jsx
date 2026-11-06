import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { cities, multanLinks, PLACEHOLDER, stopKindLabel } from "../data/site";
import { MAP_FRAME, mapRivers, mapRoutes, mapStops } from "../data/routeMap";
import { arrow, href } from "../lib/links";
import { formatHours, pkr } from "../lib/routes";

/**
 * Network map for the home page, on a dark night-map panel to match the charcoal and silver coaches:
 * every corridor glows in its own colour and draws itself in when the map scrolls into view. Pick a route
 * (the list beside the map on laptops, the chips above it on phones, or a line on the map) to zoom to it;
 * tap a town for its details. Geometry lives in src/data/routeMap.js; fares and times in src/data/site.js.
 */

const F = MAP_FRAME;
/** Phones letter the map bigger (in map units), so a picked route is framed with wider margins there. */
const phoneQuery = "(max-width: 639px)";
const subscribePhone = (cb) => {
  const q = window.matchMedia(phoneQuery);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};
const pct = (n) => `${n.toFixed(3)}%`;
const isMajor = (s) => s.kind !== "stop";

const routeName = (r, lang) => {
  const a = mapStops[r.stops[0]].name[lang];
  const b = mapStops[r.stops[r.stops.length - 1]].name[lang];
  return lang === "ur" ? `${a} سے ${b}` : `${a} → ${b}`;
};
/** Shorter everyday names for map labels where the full Urdu name is too long to fit (popups keep the full name). */
const mapLabel = (k, s, lang) => (lang === "ur" && k === "DIK" ? "ڈی آئی خان" : s.name[lang]);

/** One-word stop types for the route strip (the popups use the full labels from site.js). */
const shortKind = {
  terminal: { en: "Terminal", ur: "ٹرمینل" },
  counter: { en: "Counter", ur: "کاؤنٹر" },
  "counter-office": { en: "Counter", ur: "کاؤنٹر" },
  office: { en: "Office", ur: "دفتر" },
  stop: { en: "Stop", ur: "اسٹاپ" },
};
const routeCode = (r, lang) => (lang === "ur" ? "اے سی " : "AC ") + r.num;

/** Journey time and the booking search for a route: Lahore routes use the city data, the Multan route its own. */
function routeTrip(r) {
  const from = mapStops[r.stops[0]].cityId ?? "lahore";
  const to = mapStops[r.stops[r.stops.length - 1]].cityId;
  const city = (from === "multan" ? multanLinks : cities).find((c) => c.id === to);
  return { hours: city?.hours, path: `/book?from=${from}&to=${to}` };
}

/**
 * Name positions that differ from the stop's default side: [dx, dy, text-anchor].
 * Urdu letters are wider, and phones use bigger letters, so each gets its own set.
 */
const PLACE = {
  en: {
    desk: { LHR: [23, -6, "start"], SMJ: [20, -30, "start"] },
    mob: {
      LHR: [23, -6, "start"], SGD: [23, -6, "start"], DIK: [-23, -6, "end"],
      KHJ: [12, -2, "start"], QAD: [-12, 16, "end"], KTC: [12, 4, "start"], CHA: [-12, -2, "end"], FTP: [12, 10, "start"], SMJ: [12, -8, "start"],
    },
  },
  ur: {
    desk: { LHR: [23, -6, "start"], SMJ: [30, -26, "middle"] },
    mob: {
      LHR: [23, -6, "start"], SGD: [-30, 42, "middle"], MWL: [23, -6, "start"], KMM: [23, -6, "start"], DIK: [-36, -58, "middle"],
      KHJ: [12, -14, "start"], QAD: [-12, 16, "end"], KTC: [-12, -44, "end"], CHA: [-12, -2, "end"], FTP: [12, 16, "start"], SMJ: [12, -14, "start"],
    },
  },
};

const sidePlace = (s) => {
  const e = isMajor(s) ? 11 : 8;
  if (s.side === "l") return [-e - 16, 4, "end"];
  if (s.side === "t") return [0, -e - 16, "middle"];
  if (s.side === "b") return [0, e + 29, "middle"];
  return [e + 16, 8, "start"];
};

/** The name written beside a dot, with a short stroke from the dot pointing at it. */
function tag(s, [dx, dy, anchor]) {
  const e = isMajor(s) ? 11 : 8;
  const tx = s.x + dx;
  const ty = s.y + dy;
  const ax = anchor === "start" ? tx - 3 : anchor === "end" ? tx + 3 : tx;
  const ay = anchor === "middle" ? (dy < 0 ? ty + 3 : ty - 19) : ty - 6;
  const vx = ax - s.x;
  const vy = ay - s.y;
  const d = Math.hypot(vx, vy) || 1;
  const [ux, uy] = [vx / d, vy / d];
  const [x0, y0] = [s.x + ux * (e + 1), s.y + uy * (e + 1)];
  const [x1, y1] = [ax - ux * 2, ay - uy * 2];
  const f = (n) => n.toFixed(1);
  return { lead: `M${f(x0)},${f(y0)} L${f(x1)},${f(y1)}`, tx, ty, anchor };
}

/** Pan and zoom (map units) that frame a route; long routes stay near full size, short ones zoom in. */
function frame(r, phone) {
  if (!r) return { s: 1, x: 0, y: 0 };
  const xs = r.stops.map((k) => mapStops[k].x);
  const ys = r.stops.map((k) => mapStops[k].y);
  const [ml, mr] = phone ? [190, 120] : [95, 75];
  const x0 = Math.min(...xs) - ml, x1 = Math.max(...xs) + mr;
  const y0 = Math.min(...ys) - 50, y1 = Math.max(...ys) + 45;
  const [ax0, ax1, ay0, ay1] = [-18, 852, 34, 728];
  const s = Math.max(phone ? 0.75 : 0.85, Math.min((ax1 - ax0) / (x1 - x0), (ay1 - ay0) / (y1 - y0), phone ? 1.4 : 1.6));
  return { s, x: (ax0 + ax1) / 2 - (s * (x0 + x1)) / 2, y: (ay0 + ay1) / 2 - (s * (y0 + y1)) / 2 };
}

/** A route's number in its own colour, with a soft glow. */
function Badge({ r, size }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold leading-none text-[#0e1013]"
      style={{ background: r.color, boxShadow: `0 0 12px -2px ${r.color}`, width: size, height: size, fontSize: Math.round(size * 0.5) }}
    >
      {r.num}
    </span>
  );
}

/** Glass card behind every panel in the section. */
const glass = "border border-white/10 bg-white/[0.04] backdrop-blur-sm";

export function RouteMap({ lang }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [sel, setSel] = useState(null);
  const [run, setRun] = useState(0);
  const [pop, setPop] = useState(null);
  // Until someone opens a town, the map shows a "tap a town" hint and the town dots pulse gently.
  const [explored, setExplored] = useState(false);
  // The routes draw themselves out when the map first comes into view (see .rmap-wait in index.css).
  const svgRef = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setInView(true), io.disconnect()), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const openTown = (k) => {
    setPop((p) => (p === k ? null : k));
    setExplored(true);
  };

  const selRoute = mapRoutes.find((r) => r.id === sel) ?? null;
  const active = selRoute ? [selRoute] : mapRoutes;
  const dur = selRoute ? 2.8 : 2.0;
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(phoneQuery).matches, () => false);
  const Z = frame(selRoute, phone);
  const ease = "transform .9s cubic-bezier(.65,0,.35,1)";

  const chipsRef = useRef(null);
  const pick = (id) => {
    setSel(id);
    setRun((n) => n + 1);
    setPop(null);
    // Phones: slide the picked chip into view (a route can also be picked by tapping its line on the map).
    const row = chipsRef.current;
    const chip = row?.querySelector(`[data-route="${id ?? "all"}"]`);
    if (row && chip && row.scrollWidth > row.clientWidth) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  };

  // When each stop appears: as soon as the first route reaching it has drawn that far.
  const delays = {};
  active.forEach((r, i) => {
    const start = selRoute ? 0 : i * 0.3;
    r.stops.forEach((k, j) => {
      const t = start + r.at[j] * dur;
      if (delays[k] === undefined || t < delays[k]) delays[k] = t;
    });
  });

  const t = (en, ur) => (lang === "ur" ? ur : en);
  /** Text direction for map notes that mix Urdu and numbers (the map itself is drawn left to right). */
  const rtl = lang === "ur" ? "rtl" : "ltr";

  // Place the town popup beside its town: below it in the top half, above it in the bottom half,
  // then nudged so the whole card stays inside the map.
  const popRef = useRef(null);
  const popAt = pop ? ((Z.s * mapStops[pop].y + Z.y) / F.h) * 100 : 0;

  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    if (!window.matchMedia("(min-width: 640px)").matches) {
      // Phones: the card is a sheet over the bottom of the screen; bring the town into the clear part above it.
      el.style.top = "";
      const dot = el.parentElement.querySelector('[aria-expanded="true"]');
      if (dot) {
        const r = dot.getBoundingClientRect();
        const clear = window.innerHeight * 0.45;
        if (r.top > clear || r.top < 90) window.scrollBy({ top: r.top - clear * 0.5, behavior: "smooth" });
      }
      return;
    }
    const boxH = el.parentElement.clientHeight;
    const h = el.offsetHeight;
    const y = (popAt / 100) * boxH;
    const want = popAt < 50 ? y - 50 : y - h + 60;
    el.style.top = `${Math.max(8, Math.min(want, boxH - h - 8))}px`;
  }, [pop, popAt, lang]);

  /** A route card (laptop list) or chip (phone row); the picked one glows in its route's colour. */
  const pickStyle = (r, on) => {
    if (!on) return undefined;
    const c = r?.color ?? "#dfe4e9";
    return { borderColor: c, background: `linear-gradient(135deg, ${c}2e, ${c}0d)`, boxShadow: `0 0 26px -10px ${c}` };
  };

  const popStop = pop ? mapStops[pop] : null;
  const popCity = popStop?.cityId ? cities.find((c) => c.id === popStop.cityId) : undefined;
  const popRoutes = pop ? mapRoutes.filter((r) => r.stops.includes(pop)) : [];
  const popLeft = popStop ? ((Z.s * popStop.x + Z.x - F.x) / F.w) * 100 : 0;
  const trip = selRoute ? routeTrip(selRoute) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Route picker: a row of chips on phones (swipe sideways), a list of cards beside the map on laptops */}
      <div className="min-w-0 lg:order-2">
        <div ref={chipsRef} className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            data-route="all"
            onClick={() => pick(null)}
            aria-pressed={!selRoute}
            style={pickStyle(null, !selRoute)}
            className={`flex min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-full px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/[0.08] lg:min-h-14 lg:rounded-2xl lg:px-4 ${glass}`}
          >
            <span aria-hidden className={`h-5 w-5 shrink-0 rounded-full border-2 border-dashed lg:h-7 lg:w-7 ${!selRoute ? "border-white" : "border-white/50"}`} />
            {t("All routes", "تمام روٹس")}
          </button>
          <p className="hidden pt-3 text-[11px] font-bold tracking-[0.18em] text-white/50 lg:block">{t("AC COACHES", "اے سی بسیں")}</p>
          {mapRoutes.map((r) => (
            <button
              key={r.id}
              type="button"
              data-route={r.id}
              onClick={() => pick(r.id)}
              aria-pressed={sel === r.id}
              aria-label={`${routeCode(r, lang)}: ${routeName(r, lang)}, ${r.via[lang]}`}
              style={pickStyle(r, sel === r.id)}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-full py-1.5 pe-4 ps-1.5 text-start text-white transition-colors hover:bg-white/[0.08] lg:min-h-[60px] lg:w-full lg:gap-3 lg:rounded-2xl lg:px-3 ${glass}`}
            >
              <Badge r={r} size={28} />
              <span className="flex min-w-0 flex-col">
                <span className="whitespace-nowrap text-sm font-bold leading-tight">{routeName(r, lang)}</span>
                <span className="hidden text-xs leading-tight text-white/60 lg:block">{r.via[lang]}</span>
              </span>
            </button>
          ))}
        </div>
        <div className={`mt-4 hidden rounded-2xl p-4 lg:block ${glass}`}>
          <p className="text-[11px] font-bold tracking-[0.18em] text-white/50">{t("THE WHOLE NETWORK", "پورا نیٹ ورک")}</p>
          <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rtl:divide-x-reverse">
            {[
              [mapRoutes.length, t("routes", "روٹس")],
              [Object.keys(mapStops).length, t("towns", "شہر")],
              [2, t("hubs", "مرکز")],
            ].map(([n, label]) => (
              <div key={String(label)} className="flex flex-col px-3 first:ps-0">
                <span className="font-hand text-4xl font-bold leading-none text-white">{n}</span>
                <span className="text-xs text-white/60">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] leading-snug text-white/60">
            {t("Tap any town on the map to see what is there. Pick a route above to follow it.", "نقشے پر کسی بھی شہر پر ٹیپ کر کے تفصیل دیکھیں۔ کوئی روٹ دیکھنے کے لیے اوپر فہرست سے چنیں۔")}
          </p>
        </div>
      </div>

      {/* The map */}
      <div className="self-start overflow-hidden rounded-3xl border border-white/10 bg-[#121417] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="relative">
          <div className="relative">
            <svg
              viewBox={`${F.x} ${F.y} ${F.w} ${F.h}`}
              ref={svgRef}
              className={`rmap block h-auto w-full ${lang === "ur" ? "rmap-ur" : ""} ${selRoute ? "rmap-sel" : ""} ${inView ? "" : "rmap-wait"}`}
              style={{ direction: "ltr", overflow: "visible", clipPath: "inset(0 -30px)" }}
              role="img"
              aria-label={t(
                "Map of New Khan bus routes across Punjab, from Lahore and Multan to Mianwali, Esakhel, Bhakkar and DI Khan.",
                "پنجاب میں نیو خان کے بس روٹس کا نقشہ، لاہور اور ملتان سے میانوالی، عیسیٰ خیل، بھکر اور ڈیرہ اسماعیل خان تک۔",
              )}
            >
              <defs>
                {/* Faint terrain: soft noise lit from the north-west, so the panel reads as land at night */}
                <filter id={`${uid}-relief`} x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={4} seed={3} result="n" />
                  <feDiffuseLighting in="n" lightingColor="#ffffff" surfaceScale={2.2} result="l">
                    <feDistantLight azimuth={225} elevation={55} />
                  </feDiffuseLighting>
                  <feColorMatrix in="l" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.07 0 0 0 -0.045" />
                </filter>
                <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <radialGradient id={`${uid}-vig`} cx="55%" cy="45%" r="75%">
                  <stop offset="0%" stopColor="#1b1f24" />
                  <stop offset="100%" stopColor="#0e1013" />
                </radialGradient>
                <pattern id={`${uid}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.07)" />
                </pattern>
              </defs>
              <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={`url(#${uid}-vig)`} />
              <rect x={F.x} y={F.y} width={F.w} height={F.h} filter={`url(#${uid}-relief)`} />
              <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={`url(#${uid}-dots)`} />

              {/* Compass */}
              <g transform="translate(800 64)" className="sm-hide">
                <circle className="pen" r="24" strokeDasharray="2 4" />
                <path className="pen" d="M0,16 L0,-17 M-6,-9 L0,-18 L6,-9" />
                <text className="note" x="0" y="-30" textAnchor="middle">N</text>
              </g>

              <g className={selRoute ? "zf" : ""} style={{ transform: `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`, transformOrigin: "0 0", transition: ease }}>
                <text className="region" x={560} y={640} transform="rotate(-6 560 640)">{t("Punjab", "پنجاب")}</text>

                {mapRivers.map((r) => (
                  <path key={r.name.en} className="river" d={r.d} />
                ))}
                {mapRivers.map((r) => (
                  <text key={r.name.en} className="rivlab sm-hide" x={r.label.x} y={r.label.y} transform={`rotate(${r.label.rotate} ${r.label.x} ${r.label.y})`}>
                    {r.name[lang]}
                  </text>
                ))}

                {/* Scale bar */}
                <g transform="translate(36 680)" className="sm-hide">
                  <path className="pen" d="M0,0 L103,1 M0,-6 L0,6 M52,-4 L52,4 M103,-6 L103,7" />
                  <text className="note-s" x="0" y="-12" direction={rtl} textAnchor={rtl === "rtl" ? "end" : "start"}>{t("about 50 km", "تقریباً 50 کلومیٹر")}</text>
                </g>

                {mapRoutes.map((r) => (
                  <path key={r.id} className="base" d={r.d} />
                ))}
                {Object.entries(mapStops).map(([k, s]) => (
                  <circle key={k} className="fdot" cx={s.x} cy={s.y} r="4" />
                ))}
                <rect className={selRoute ? "veil veil-on" : "veil"} x="-2000" y="-2000" width="5000" height="5000" />

                {/* Animated lines: a soft glow, the coloured line and a bright core. The key restarts the drawing whenever the selection changes. */}
                <g key={`lines-${run}`}>
                  {active.map((r, i) => {
                    const start = selRoute ? 0 : i * 0.3;
                    const mid = `${uid}-m-${r.id}`;
                    return (
                      <g key={r.id}>
                        <mask id={mid} maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="5000" height="5000">
                          {/* Real lengths, not pathLength: Chrome ignores pathLength for dashes inside a mask. */}
                          <path
                            className="mask"
                            d={r.d}
                            style={{ "--len": r.len + 20, strokeDasharray: r.len + 20, animationDuration: `${dur}s`, animationDelay: `${start}s` }}
                          />
                        </mask>
                        <g mask={`url(#${mid})`}>
                          <path className="glow" d={r.d} style={{ stroke: r.color }} filter={`url(#${uid}-glow)`} />
                          <path className="hl" d={r.d} style={{ stroke: r.color }} />
                          <path className="ink" d={r.d} />
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* Tap or click a line on the map to pick its route (wide invisible strokes over each route). */}
                {mapRoutes.map((r) => (
                  <path key={r.id} className="hit" d={r.d} onClick={() => pick(r.id)} />
                ))}

                <g key={`stops-${run}`}>
                  {Object.entries(delays).map(([k, d]) => {
                    const s = mapStops[k];
                    const major = isMajor(s);
                    const st = { animationDelay: `${d.toFixed(2)}s` };
                    return (
                      <g key={k}>
                        {s.kind === "terminal" && <circle className="ring" cx={s.x} cy={s.y} r="9" style={st} />}
                        <circle className={`dot ${major ? "dot-major" : "dot-minor"}`} cx={s.x} cy={s.y} r={major ? 8.5 : 5} style={st} />
                      </g>
                    );
                  })}
                </g>

                {/* Town names are tappable too (mouse); keyboard and screen readers use the town buttons over the dots. */}
                {Object.entries(mapStops).flatMap(([k, s]) => {
                  const desk = PLACE[lang].desk[k] ?? sidePlace(s);
                  const mob = PLACE[lang].mob[k] ?? desk;
                  const off = selRoute && delays[k] === undefined;
                  const cls = `tag${isMajor(s) ? " tag-major" : ""}${off ? " tag-off" : ""}${pop === k ? " tag-on" : ""}`;
                  // A town with its own phone position is drawn twice; CSS shows the right one for the screen.
                  const variants = mob === desk ? [["", desk]] : [[" tag-dk", desk], [" tag-mb", mob]];
                  return variants.map(([v, p]) => {
                    const g = tag(s, p);
                    return (
                      <g key={k + v} className={cls + v} onClick={() => openTown(k)}>
                        <path className="lead" d={g.lead} />
                        <text x={g.tx} y={g.ty} textAnchor={g.anchor}>{mapLabel(k, s, lang)}</text>
                      </g>
                    );
                  });
                })}

                <g pointerEvents="none" className="sm-hide">
                  <path className="pen" d="M808,428 C802,404 792,392 774,378 M774,378 L778,389 M774,378 L785,381" />
                  <text className="note" x="846" y="448" direction={rtl} textAnchor={rtl === "rtl" ? "start" : "end"}>{t("Lahore main terminal", "لاہور مین ٹرمینل")}</text>
                  <text className="note-s" x="846" y="468" direction={rtl} textAnchor={rtl === "rtl" ? "start" : "end"}>{t("55 Lawrence Rd", "55 لارنس روڈ")}</text>
                </g>

                {/* Buses last, so they drive over town names instead of disappearing under them */}
                <g key={`buses-${run}`}>
                  {active.map((r, i) => (
                    <g key={r.id} className="bus" style={{ animationDelay: `${((selRoute ? 0 : i * 0.3) + dur).toFixed(2)}s` }}>
                      <g transform="translate(-11 -6)">
                        <rect width="22" height="11" rx="3" fill={r.color} stroke="#0e1013" strokeWidth="1.6" />
                        <path d="M14,2.5 H19.5 V6 H14 Z M3,2.5 H11 V6 H3 Z" fill="#e9ecef" stroke="#0e1013" strokeWidth="1" />
                        <circle cx="5.5" cy="11" r="2.3" fill="#0e1013" />
                        <circle cx="16.5" cy="11" r="2.3" fill="#0e1013" />
                      </g>
                      <animateMotion dur={`${(r.len / (selRoute ? 90 : 55)).toFixed(1)}s`} repeatCount="indefinite" path={r.d} rotate="auto" />
                    </g>
                  ))}
                </g>
              </g>
            </svg>

            {/* Town buttons, kept over their dots through the zoom */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                transform: `translate(${pct(((Z.x - F.x * (1 - Z.s)) / F.w) * 100)}, ${pct((Z.y / F.h) * 100)}) scale(${Z.s})`,
                transformOrigin: "0 0",
                transition: ease,
              }}
            >
              {Object.entries(mapStops).map(([k, s]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => openTown(k)}
                  aria-label={`${s.name[lang]}, ${stopKindLabel[s.kind][lang]}`}
                  aria-expanded={pop === k}
                  className={`rmap-town pointer-events-auto absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full transition-shadow hover:shadow-[0_0_0_5px_rgba(255,255,255,0.18)] focus-visible:shadow-[0_0_0_3px_#dfe4e9] focus-visible:outline-none ${pop === k ? "shadow-[0_0_0_5px_rgba(255,255,255,0.28)]" : ""} ${!explored && !selRoute && isMajor(s) ? "rmap-town-hint" : ""}`}
                  style={{ left: pct(((s.x - F.x) / F.w) * 100), top: pct((s.y / F.h) * 100) }}
                />
              ))}
            </div>
          </div>

          {/* The map's main action, said plainly until the first town is opened */}
          {!explored && !selRoute && (
            <p className={`pointer-events-none absolute right-3 top-3 z-[5] flex items-center gap-2 whitespace-nowrap rounded-full py-1 pe-4 ps-1.5 text-white sm:right-20 sm:top-4 ${glass} bg-[#1b1f24]/80`}>
              <span aria-hidden className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/25 motion-reduce:hidden" />
                <span className="relative h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-[#121417]" />
              </span>
              <span className="font-hand text-lg font-bold leading-none sm:text-xl">
                <span className="sm:hidden">{t("Tap a town", "شہر پر ٹیپ کریں")}</span>
                <span className="hidden sm:inline">{t("Tap a town to see what's there", "کسی شہر پر ٹیپ کریں")}</span>
              </span>
            </p>
          )}

          {popStop && pop && (
            <div
              role="dialog"
              aria-label={popStop.name[lang]}
              ref={popRef}
              className="rmap-pop fixed inset-x-3 bottom-[92px] z-40 flex max-h-[52svh] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-white/15 bg-[#1a1d21]/95 p-4 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-[var(--pl)] sm:z-10 sm:max-h-[calc(100%-16px)] sm:w-[270px]"
              style={{ "--pl": popLeft > 58 ? `calc(${pct(popLeft)} - 292px)` : `calc(${pct(popLeft)} + 22px)` }}
            >
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/50">{stopKindLabel[popStop.kind][lang]}</span>
                  <span className="font-hand text-[32px] font-bold leading-none">{popStop.name[lang]}</span>
                  <span className="text-sm text-white/60">{popStop.name[lang === "ur" ? "en" : "ur"]}</span>
                </div>
                <button type="button" onClick={() => setPop(null)} aria-label={t("Close", "بند کریں")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M2,2 L12,12 M12,2 L2,12" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {popCity && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col rounded-xl bg-white/[0.06] px-2.5 py-2">
                    <span className="text-[11px] text-white/55">{t("From Lahore", "لاہور سے")}</span>
                    <span className="text-[15px] font-bold">{formatHours(popCity.hours, lang)}</span>
                  </div>
                  <div className="flex flex-col rounded-xl bg-white/[0.06] px-2.5 py-2">
                    <span className="text-[11px] text-white/55">{t("Fares from", "کم از کم کرایہ")}</span>
                    <span className="ltr text-[15px] font-bold">
                      {pkr(Math.min(...Object.values(popCity.fares)))}
                      {PLACEHOLDER && "*"}
                    </span>
                  </div>
                </div>
              )}
              {popStop.note && <p className="text-[13px] leading-snug text-white/75">{popStop.note[lang]}</p>}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.14em] text-white/50">
                  {lang === "ur" ? `${popRoutes.length} روٹ یہاں رکتے ہیں` : popRoutes.length === 1 ? "1 ROUTE STOPS HERE" : `${popRoutes.length} ROUTES STOP HERE`}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popRoutes.map((r) => (
                    <span
                      key={r.id}
                      title={`${routeName(r, lang)}, ${r.via[lang]}`}
                      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] py-0.5 pe-2.5 ps-1 text-xs font-semibold"
                    >
                      <Badge r={r} size={20} />
                      <span className="sr-only">{`${routeCode(r, lang)}: ${routeName(r, lang)}, ${r.via[lang]}`}</span>
                      <span aria-hidden>{mapStops[r.stops[r.stops.length - 1]].name[lang]}</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* The card's one action: book a bus to this town (from Lahore) */}
              <Link to={href(lang, popCity ? `/book?from=lahore&to=${popCity.id}` : "/book")} className="btn btn-gold !min-h-12 !rounded-xl !border-white/20 !font-extrabold">
                {popCity ? t(`Book a bus to ${popStop.name.en} now!`, `${popStop.name.ur} کی بس ابھی بُک کریں!`) : t("Book a bus now!", "ابھی بس بُک کریں!")} {arrow(lang)}
              </Link>
            </div>
          )}
        </div>

        {/* Under the map: the picked route (a stop list on phones, a line diagram on larger screens), or the legend */}
        {selRoute && trip ? (
          <div className="flex flex-col gap-3 border-t border-white/10 bg-[#0e1013]/80 px-4 py-4 text-white sm:flex-row sm:items-center sm:gap-5 sm:py-3">
            <div className="flex shrink-0 items-start justify-between gap-3 sm:w-52 sm:flex-col sm:justify-start sm:gap-0">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <Badge r={selRoute} size={24} />
                  <span className="text-[10.5px] font-bold tracking-[0.14em] text-white/50">{t("AC COACH", "اے سی بس")}</span>
                </span>
                <span className="mt-1 font-hand text-2xl font-bold leading-tight">{routeName(selRoute, lang)}</span>
                <span className="text-xs text-white/60">{selRoute.via[lang]}</span>
              </div>
              {trip.hours !== undefined && (
                <span className="mt-1 shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-white/80 sm:mt-2">
                  {t("about ", "تقریباً ")}
                  {formatHours(trip.hours, lang)}
                </span>
              )}
            </div>

            {/* Phones: the stops as a vertical line, then the booking button */}
            <ol className="relative ms-1 flex flex-col gap-0.5 sm:hidden">
              <span aria-hidden className="absolute bottom-3 start-[7px] top-3 w-[3px] rounded-full" style={{ background: selRoute.color, boxShadow: `0 0 10px ${selRoute.color}` }} />
              {selRoute.stops.map((k) => {
                const s = mapStops[k];
                const major = isMajor(s);
                return (
                  <li key={k}>
                    <button type="button" onClick={() => openTown(k)} aria-expanded={pop === k} className="relative flex min-h-10 w-full items-center gap-3 text-start">
                      <span
                        aria-hidden
                        className="relative z-[1] ms-px block shrink-0 rounded-full border-white"
                        style={{ width: major ? 15 : 11, height: major ? 15 : 11, marginInlineStart: major ? 0 : 2, borderWidth: major ? 3 : 2, background: pop === k ? selRoute.color : "#121417" }}
                      />
                      <span className={`text-[15px] leading-tight ${major ? "font-bold" : "text-white/80"}`}>{s.name[lang]}</span>
                      <span className="ms-auto text-[11px] text-white/45">{shortKind[s.kind][lang]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <Link to={href(lang, trip.path)} className="btn btn-gold !min-h-12 !rounded-xl !border-white/20 !font-extrabold sm:hidden">
              {t("Book this route", "یہ روٹ بُک کریں")} {arrow(lang)}
            </Link>

            {/* Larger screens: the stops as a line diagram */}
            <div className="hidden overflow-x-auto sm:block sm:flex-grow">
              <ol className="relative flex min-w-0">
                <span
                  aria-hidden
                  className="absolute top-[13px] h-[5px] rounded-full"
                  style={{ left: pct(50 / selRoute.stops.length), right: pct(50 / selRoute.stops.length), background: selRoute.color, boxShadow: `0 0 12px ${selRoute.color}` }}
                />
                {selRoute.stops.map((k) => {
                  const s = mapStops[k];
                  const major = isMajor(s);
                  const on = pop === k;
                  return (
                    <li key={k} className="relative flex-1">
                      <button
                        type="button"
                        onClick={() => openTown(k)}
                        aria-expanded={on}
                        className="group flex w-full flex-col items-center gap-1 px-0.5 pb-0.5 pt-1.5 text-center focus-visible:outline-none"
                      >
                        <span
                          aria-hidden
                          className="block rounded-full border-white transition-transform group-hover:scale-125 group-focus-visible:scale-125 group-focus-visible:shadow-[0_0_0_3px_#dfe4e9]"
                          style={{
                            width: major ? 16 : 12,
                            height: major ? 16 : 12,
                            borderWidth: major ? 3 : 2.5,
                            marginTop: major ? 0 : 2,
                            background: on ? selRoute.color : "#121417",
                            transform: on ? "scale(1.3)" : undefined,
                          }}
                        />
                        <span className={`text-xs font-bold leading-tight underline-offset-4 group-hover:underline ${on ? "underline" : ""}`}>{s.name[lang]}</span>
                        <span className="text-[10.5px] leading-tight text-white/50">{shortKind[s.kind][lang]}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
            <Link to={href(lang, trip.path)} className="hidden shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-white hover:bg-white/10 sm:inline-flex">
              {t("Book", "بُک کریں")} {arrow(lang)}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 bg-[#0e1013]/80 px-4 py-3 text-xs text-white/70">
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-7 rounded-full bg-[linear-gradient(90deg,#e9b23a,#3f9c8f,#4a7fc1,#ef7f52)] shadow-[0_0_8px_rgba(233,178,58,0.5)]" />
              {t("AC coach", "اے سی بس")}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-[#121417]" />
              {t("Terminal or counter", "ٹرمینل یا کاؤنٹر")}
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#dfe4e9]" />
              {t("Stop", "اسٹاپ")}
            </span>
            <span className="font-hand text-lg font-bold text-white/60 sm:ms-auto">{t("since 1956", "1956 سے")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
