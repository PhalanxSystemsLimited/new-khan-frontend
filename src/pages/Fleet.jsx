import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { PageHero, PageSectionHead } from "../components/PageHero";
import { PlaceholderNote, usePageMeta } from "../components/parts";
import { mapRoutes, mapStops } from "../data/routeMap";
import { PLACEHOLDER, busTypes, cities, company, multanLinks } from "../data/site";
import { u } from "../lib/i18n";
import { arrow, href } from "../lib/links";
import { formatHours, pkr } from "../lib/routes";
import { useLang } from "../lib/useLang";

/** On board, in four lines (the same comforts the home page lists). */
const comforts = [
  { icon: "snow", title: { en: "Air-conditioned", ur: "ایئر کنڈیشنڈ" }, body: { en: "Cool the whole way, summer or not.", ur: "پورے سفر میں ٹھنڈک۔" } },
  { icon: "seat", title: { en: "Reclining seats", ur: "ریکلائننگ سیٹیں" }, body: { en: "Lean back on the long stretches.", ur: "لمبے سفر میں آرام سے ٹیک لگائیں۔" } },
  { icon: "curtain", title: { en: "Curtained windows", ur: "پردوں والی کھڑکیاں" }, body: { en: "Shade from the afternoon sun.", ur: "دوپہر کی دھوپ سے بچاؤ۔" } },
  { icon: "bag", title: { en: "Luggage hold", ur: "سامان کی جگہ" }, body: { en: "A 20 kg case travels free.", ur: "20 کلو تک کا سوٹ کیس مفت۔" } },
];

const photos = [
  { src: "/images/journey/family-2026.webp", cap: { en: "Room for the whole family", ur: "پوری فیملی کے لیے جگہ" } },
  { src: "/images/team/cockpit-2026.webp", cap: { en: "Experienced drivers on every route", ur: "ہر روٹ پر تجربہ کار ڈرائیور" } },
];

const lineName = (r, lang) => {
  const a = mapStops[r.stops[0]].name[lang];
  const b = mapStops[r.stops[r.stops.length - 1]].name[lang];
  return lang === "ur" ? `${a} سے ${b}` : `${a} → ${b}`;
};

/** Fares and journey times along one route, from where it starts, for every stop that has them on file. */
function fareRows(r) {
  const from = mapStops[r.stops[0]].cityId ?? "lahore";
  const list = from === "multan" ? multanLinks : cities;
  return r.stops.slice(1).flatMap((k) => {
    const id = mapStops[k].cityId;
    const c = id ? list.find((x) => x.id === id) : undefined;
    const fare = c?.fares.ac;
    return c && fare ? [{ key: k, city: c, fare, slug: `${from}-to-${c.id}` }] : [];
  });
}

/** One route as a fare card: its colour and number, then each town with journey time and fare. */
function FareCard({ r, lang }) {
  const rows = fareRows(r);
  return (
    <li className="overflow-hidden rounded-2xl border-2 border-[#1b1e21] bg-white shadow-[4px_4px_0_#1b1e21]">
      <div className="flex items-center gap-3 bg-[#121417] px-4 py-3 text-white sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-[#0e1013]" style={{ background: r.color, boxShadow: `0 0 14px -2px ${r.color}` }}>
          {r.num}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight">{lineName(r, lang)}</h3>
          <p className="text-xs text-white/60">{r.via[lang]}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.15em] text-mute">
            <th className="px-4 pb-1 pt-3 text-start font-semibold sm:px-5">{lang === "ur" ? "منزل" : "To"}</th>
            <th className="px-2 pb-1 pt-3 text-start font-semibold">{lang === "ur" ? "وقت" : "Time"}</th>
            <th className="px-4 pb-1 pt-3 text-end font-semibold sm:px-5">{lang === "ur" ? "کرایہ" : "Fare"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.key} className="border-t border-[#1b1e21]/10">
              <td className="px-4 py-2.5 sm:px-5">
                <Link to={href(lang, `/routes/${x.slug}`)} className="inline-flex items-center gap-2 font-semibold text-black hover:underline">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {x.city.name[lang]}
                </Link>
              </td>
              <td className="px-2 py-2.5 text-mute">{formatHours(x.city.hours, lang)}</td>
              <td className="ltr px-4 py-2.5 text-end font-bold text-black sm:px-5">
                {pkr(x.fare)}
                {PLACEHOLDER && "*"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </li>
  );
}

/** Fleet & Routes (also served at /routes): the coach, then every route with its towns, times and fares. */
export default function Fleet() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "بسیں اور روٹس: اے سی کوچیں، کرایے اور اوقات" : "Fleet and routes: AC coaches, fares and timings",
    ur ? "نیو خان کی اے سی کوچیں، اور لاہور، ملتان اور ڈیرہ اسماعیل خان کے تمام روٹس۔" : "New Khan's AC coaches, and every route from Lahore, Multan and DI Khan.",
  );
  const ac = busTypes[0];
  const lowest = Math.min(...[...cities, ...multanLinks].map((c) => c.fares.ac).filter((n) => typeof n === "number"));
  const towns = Object.keys(mapStops).length;

  return (
    <>
      <PageHero
        lang={lang}
        crumbs={[{ name: u("navFleet", lang) }]}
        eyebrow={u("navFleet", lang)}
        title={ur ? `${company.fleet.ac} نئی کوچیں، ${mapRoutes.length} روٹس` : `${company.fleet.ac} new coaches, ${mapRoutes.length} routes`}
        lead={ur ? "ایک ہی معیار کی اے سی کوچیں، لاہور اور ملتان سے پورے پنجاب تک۔" : "One standard of air-conditioned coach, from Lahore and Multan across Punjab."}
        facts={[
          { value: pkr(lowest), label: ur ? "سے کرایہ" : "fares from" },
          { value: String(towns), label: ur ? "شہر" : "towns" },
          { value: "AC", label: ur ? "ہر بس" : "every coach" },
        ]}
        image="/images/fleet/fleet-row.webp"
        imagePosition="60% 55%"
      />

      {/* The coach */}
      <section className="section">
        <div className="container-nk">
          <PageSectionHead n="1" eyebrow={ur ? "ہماری بس" : "The coach"} title={ur ? "نئی ہائیگر اے سی کوچ" : "The new Higer AC coach"} lead={ac.blurb[lang]} />
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <figure className="overflow-hidden rounded-3xl border-2 border-[#1b1e21] shadow-[6px_6px_0_#1b1e21]">
              <div className="relative aspect-[16/10]">
                <img src={ac.image} alt={ur ? "نیو خان کی نئی ہائیگر اے سی کوچ" : "New Khan's new Higer AC coach"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_55%]" />
                <span className="ltr absolute end-3 top-3 rounded-full bg-[#0e1013]/85 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
                  {u("fromFare", lang)} {pkr(lowest)}
                  {PLACEHOLDER && "*"}
                </span>
              </div>
            </figure>
            <div className="grid grid-cols-2 gap-3">
              {comforts.map((c, i) => (
                <div key={i} className="flex flex-col rounded-2xl border-2 border-[#1b1e21] bg-white p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b1e21] text-gold-bright">
                    <Icon name={c.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-bold text-black">{c.title[lang]}</p>
                  <p className="mt-1 text-sm text-mute">{c.body[lang]}</p>
                </div>
              ))}
            </div>
          </div>
          {/* On board: two smaller photos */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {photos.map((p) => (
              <figure key={p.src} className="relative overflow-hidden rounded-3xl border-2 border-[#1b1e21]">
                <div className="relative aspect-[16/9]">
                  <img src={p.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-bold text-white sm:text-xl">{p.cap[lang]}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-3 text-xs text-mute">{ur ? "تصاویر مثال کے طور پر ہیں۔" : "Illustrative images."}</p>
        </div>
      </section>

      {/* Routes and fares */}
      <section id="routes" className="section scroll-mt-24 bg-coal">
        <div className="container-nk">
          <PageSectionHead
            n="2"
            eyebrow={ur ? "روٹس اور کرایے" : "Routes and fares"}
            title={ur ? "کہاں تک، کتنی دیر، کتنے میں" : "Where to, how long, how much"}
            lead={ur ? "کسی بھی شہر پر ٹیپ کریں اور اوقات دیکھ کر بُک کریں۔" : "Tap any town to see its timings and book."}
            action={
              <Link to={href(lang, "/terminals")} className="btn btn-ghost !min-h-11 !py-2 text-sm">
                {u("navTerminals", lang)} {arrow(lang)}
              </Link>
            }
          />
          <ul className="mt-8 grid items-start gap-4 md:grid-cols-2">
            {mapRoutes.map((r) => (
              <FareCard key={r.id} r={r} lang={lang} />
            ))}
          </ul>
          <div className="mt-6 max-w-2xl">
            <PlaceholderNote lang={lang} />
          </div>
        </div>
      </section>
    </>
  );
}
