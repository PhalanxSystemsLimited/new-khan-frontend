import { useEffect, useRef } from "react";
import { heritage, team } from "../data/site";
import { u } from "../lib/i18n";
import { SectionHead } from "./parts";

/* The About page's "Our journey" (the sketched road) and "Our people". The home page has its own, shorter journey. */

const Illustrative = ({ lang }) => (
  <p className="mt-3 text-xs text-mute">{lang === "ur" ? "تصاویر مثال کے طور پر ہیں۔" : "Illustrative images. Replace with real photographs."}</p>
);

/** "The people behind your journey" cards. */
export function TeamSection({ lang }) {
  return (
    <section className="section">
      <div className="container-nk">
        <SectionHead eyebrow={lang === "ur" ? "ہمارے لوگ" : "Our people"} title={lang === "ur" ? "آپ کے سفر کے پیچھے ہمارے لوگ" : "The people behind your journey"} />
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
          {team.map((m, i) => (
            <li key={m.id} className="reveal ink-card lift group overflow-hidden" style={{ "--i": i }}>
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={m.image} alt={m.title[lang]} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="h3 text-base text-black sm:text-lg">{m.title[lang]}</h3>
                <p className="mt-1 text-xs text-mute sm:text-sm">{m.body[lang]}</p>
              </div>
            </li>
          ))}
        </ul>
        <Illustrative lang={lang} />
      </div>
    </section>
  );
}

/**
 * The road the journey is drawn on, sketched in ink like the route map: two wobbly kerb lines and a dashed
 * centre line. Drawn twice: a faint pencil guide underneath, and the inked road on top that draws itself
 * down the page as you scroll (see JourneyTrack).
 */
function JourneyRoad({ guide = false }) {
  const d = "M50,0 C72,90 28,180 50,270 C72,360 28,450 50,540 C72,630 28,720 50,810 C66,880 50,950 50,1000";
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 1000"
      preserveAspectRatio="none"
      className={`jroad ${guide ? "jroad-guide" : "jroad-main"} pointer-events-none absolute inset-y-0 h-full w-14 max-md:[inset-inline-start:0] md:left-1/2 md:w-[120px] md:-translate-x-1/2`}
    >
      {guide && (
        <defs>
          <filter id="jrough" filterUnits="userSpaceOnUse" x="-200" y="-60" width="500" height="1120">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={4} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      )}
      <g filter="url(#jrough)">
        <path className="kerb" d={d} />
        <path className="asphalt" d={d} />
        <path className="centre" d={d} />
      </g>
    </svg>
  );
}

/** A quick pen scribble under a heading, like underlining in a notebook. */
const Scribble = ({ className = "" }) => (
  <svg aria-hidden viewBox="0 0 160 14" className={`jscrib ${className}`} preserveAspectRatio="none">
    <path pathLength={1} d="M3,9 C40,3 80,4 157,6 M10,12 C60,8 110,9 150,10" fill="none" stroke="#c5ccd3" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * Brings the journey to life as you scroll: the inked road draws itself, a little coach drives along it
 * (following the bends), and each year arrives as the coach reaches it. The CSS reads --p on the list (0 to 1)
 * and data-in on each year. With reduced motion the whole journey simply shows at once.
 */
function JourneyTrack({ children, endLabel }) {
  const ref = useRef(null);
  const bus = useRef(null);
  const end = useRef(null);

  useEffect(() => {
    const ol = ref.current;
    const coach = bus.current;
    if (!ol || !coach) return;
    const steps = [...ol.querySelectorAll(":scope > li[data-step]")];
    const path = ol.querySelector("svg.jroad-main path.centre");
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;

    // Points along the road in the drawing's own units (x 0-100, y 0-1000), sampled once.
    const len = path.getTotalLength();
    const pts = Array.from({ length: 241 }, (_, k) => path.getPointAtLength((len * k) / 240));

    const place = (p) => {
      const box = svg.getBoundingClientRect();
      const base = ol.getBoundingClientRect();
      // getBoundingClientRect is in screen pixels; the page may be CSS-zoomed (see main.jsx), so divide it out.
      const z = parseFloat(document.getElementById("root")?.style.zoom) || 1;
      const toPx = (q) => [(box.left - base.left) / z + (q.x / 100) * (box.width / z), (q.y / 1000) * (box.height / z)];
      const target = p * 1000;
      let k = pts.findIndex((q) => q.y >= target);
      if (k < 0) k = pts.length - 1;
      const [x, y] = toPx(pts[k]);
      const [ax, ay] = toPx(pts[Math.max(0, k - 2)]);
      const [bx, by] = toPx(pts[Math.min(pts.length - 1, k + 2)]);
      // The coach is drawn pointing down the page; turn it to follow the road.
      const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI - 90;
      coach.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg)`;
      // The closing words sit beside the end of the road (on the reading side).
      const label = end.current;
      if (label) {
        const [ex, ey] = toPx(pts[pts.length - 1]);
        const rtl = getComputedStyle(ol).direction === "rtl";
        label.style.transform = `translate(${(rtl ? ex - 30 : ex + 30).toFixed(1)}px, ${ey.toFixed(1)}px) translate(${rtl ? "-100%" : "0"}, -50%)`;
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      steps.forEach((s) => (s.dataset.in = "1"));
      ol.style.setProperty("--p", "1");
      ol.dataset.done = "1";
      place(1);
      const onResize = () => place(1);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    ol.dataset.anim = "1";
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && (e.target.dataset.in = "1")), { rootMargin: "0px 0px -18% 0px" });
    steps.forEach((s) => io.observe(s));

    let frame = 0;
    const update = () => {
      frame = 0;
      const r = ol.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
      ol.style.setProperty("--p", p.toFixed(4));
      if (p > 0.985) ol.dataset.done = "1";
      else delete ol.dataset.done;
      place(p);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, []);

  return (
    <ol ref={ref} className="jtrack relative mt-10 pb-24 sm:mt-14">
      {children}
      {/* The coach, seen from above */}
      <li ref={bus} aria-hidden className="jbus pointer-events-none absolute left-0 top-0 z-10">
        <svg width="26" height="50" viewBox="0 0 26 50">
          <rect x="2" y="2" width="22" height="46" rx="5" fill="#c5ccd3" stroke="#1b1e21" strokeWidth="2.2" />
          <rect x="4.5" y="37" width="17" height="8" rx="2" fill="#1b1e21" />
          <rect x="7" y="9" width="12" height="7" rx="1.5" fill="#ffffff" stroke="#1b1e21" strokeWidth="1.4" />
          <path d="M3,22 C9,20 13,26 23,23 M3,29 C10,27 14,33 23,30" fill="none" stroke="#1b1e21" strokeWidth="2" strokeLinecap="round" />
          <path d="M2,39 L0,40 M24,39 L26,40" stroke="#1b1e21" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </li>
      <li ref={end} aria-hidden className="jend pointer-events-none absolute left-0 top-0 whitespace-nowrap font-hand text-2xl font-bold">
        {endLabel}
      </li>
    </ol>
  );
}

/**
 * "Our journey": 1956 to today, sketched on paper. At each year a milestone stone pops up, the year is
 * underlined and a photo is taped in. The past is in pencil tones; today's photo is in full colour.
 */
export function JourneySection({ lang }) {
  const yearOf = (y) => (y === "Today" && lang === "ur" ? "آج" : y);
  return (
    <section className="jpaper section overflow-hidden border-y-2 border-[#1b1e21] text-[#1b1e21]">
      <div className="container-nk">
        <SectionHead
          eyebrow={u("since", lang)}
          title={lang === "ur" ? "ہمارا سفر" : "Our journey"}
          lead={lang === "ur" ? "لاہور کی ایک سڑک سے پورے پنجاب تک۔" : "From one road out of Lahore to the whole of Punjab."}
        />

        <JourneyTrack endLabel={lang === "ur" ? "اور سفر جاری ہے…" : "and the road goes on…"}>
          <JourneyRoad guide />
          <JourneyRoad />
          {heritage.map((h, i) => {
            const flip = i % 2 === 1;
            const today = h.year === "Today";
            return (
              <li key={h.year} data-step className="relative grid items-center gap-5 pb-14 ps-16 last:pb-6 md:grid-cols-[1fr_120px_1fr] md:gap-8 md:ps-0 md:pb-20">
                {/* Milestone stone on the road: gold cap, paper body, the year written on it */}
                <span
                  aria-hidden
                  style={{ "--tilt": flip ? "3deg" : "-3deg" }}
                  className="jstone absolute top-1 z-[11] flex h-[60px] w-11 flex-col overflow-hidden rounded-t-[22px] rounded-b-md border-[2.5px] border-[#1b1e21] bg-[#ffffff] shadow-[3px_3px_0_#1b1e21] [inset-inline-start:6px] md:static md:col-start-2 md:row-start-1 md:mx-auto md:h-[84px] md:w-16"
                >
                  <span className="h-[42%] border-b-[2.5px] border-[#1b1e21] bg-[repeating-linear-gradient(135deg,#c5ccd3_0_4px,#dfe4e9_4px_7px)]" />
                  <span className="ltr flex flex-1 items-center justify-center font-hand text-[15px] font-bold leading-none md:text-xl">
                    {today ? (lang === "ur" ? "آج" : "Now") : `'${h.year.slice(2)}`}
                  </span>
                </span>

                <div className={`md:row-start-1 ${flip ? "md:col-start-3" : "md:col-start-1 md:text-end"}`}>
                  <p className="jyear ltr inline-block font-hand text-6xl font-bold leading-none md:text-7xl">
                    {yearOf(h.year)}
                    <Scribble className="mt-1 block h-3 w-full" />
                  </p>
                  <p className={`jtext mt-3 max-w-md text-lg leading-snug text-[#3a3f45] ${flip ? "" : "md:ms-auto"}`}>{h.text[lang]}</p>
                </div>

                {h.image && (
                  <figure className={`md:row-start-1 ${flip ? "md:col-start-1" : "md:col-start-3"}`}>
                    {/* A print taped into a sketchbook */}
                    <div
                      style={{ "--tilt": flip ? "-2deg" : "2deg" }}
                      className="jphoto relative mx-auto max-w-[460px] border-[2.5px] border-[#1b1e21] bg-[#ffffff] p-2.5 pb-10 shadow-[5px_5px_0_#1b1e21]"
                    >
                      <span aria-hidden className="jtape absolute -top-3.5 left-1/2 h-7 w-24 border border-[#1b1e21]/30 bg-[#c5ccd3]/60" />
                      <img src={h.image} alt="" width={1000} height={664} loading="lazy" decoding="async" className={`${today ? "" : "jsketch"} aspect-[16/10] h-auto w-full border-2 border-[#1b1e21] object-cover`} />
                      <figcaption className="ltr absolute inset-x-0 bottom-1.5 text-center font-hand text-xl font-bold">{yearOf(h.year)}</figcaption>
                    </div>
                  </figure>
                )}
              </li>
            );
          })}
        </JourneyTrack>
        <p className="mt-12 text-xs text-[#3a3f45]/80">{lang === "ur" ? "تصاویر مثال کے طور پر ہیں؛ اصل آرکائیو تصاویر سے بدلیں۔" : "Illustrative images. Replace with archive photographs."}</p>
      </div>
    </section>
  );
}
