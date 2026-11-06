import { Link, useParams } from "react-router-dom";
import { DestinationExplorer } from "../components/DestinationExplorer";
import { Breadcrumbs, PlaceholderNote, usePageMeta } from "../components/parts";
import { RouteBookBox } from "../components/RouteBookBox";
import { RouteCard } from "../components/RouteCard";
import { TerminalCard } from "../components/TerminalCard";
import { PLACEHOLDER, busTypes } from "../data/site";
import { u } from "../lib/i18n";
import { arrow, href } from "../lib/links";
import {
  allRoutes,
  boardingTerminals,
  cityImage,
  formatHours,
  formatTime,
  getRoute,
  lowestFare,
  mapOriginsTo,
  pkr,
  routeFaq,
  routeIntro,
  routeTitle,
  routesTo,
} from "../lib/routes";
import { useLang } from "../lib/useLang";
import { NotFound, notFoundTitle } from "./NotFound";

/** A town banner: the 4:3 photo on phones, the 21:9 one on larger screens (only one is downloaded). */
function TownBanner({ id, children }) {
  const card = cityImage(id, "card");
  if (!card) return null;
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-black bg-black">
      <div className="relative aspect-[4/3] sm:aspect-[21/9]">
        <picture>
          <source media="(min-width: 640px)" srcSet={cityImage(id, "wide")} />
          <img src={card} alt="" fetchpriority="high" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
      </div>
      {children}
    </div>
  );
}

/** One route, one direction: /routes/lahore-to-multan. */
export function RoutePage() {
  const lang = useLang();
  const { slug } = useParams();
  const route = getRoute(slug);
  const title = route ? routeTitle(route, lang) : "";
  usePageMeta(
    route ? (lang === "ur" ? `${title} بس: کرایہ، اوقات اور بکنگ` : `${title} Bus: Fares, Timings & Booking`) : notFoundTitle(lang),
    route &&
      (lang === "ur"
        ? `${title} اے سی بس، روزانہ ${route.departures.length} روانگیاں، تقریباً ${formatHours(route.city.hours, lang)}۔ کرایہ ${pkr(lowestFare(route))} سے۔`
        : `${title} AC bus with ${route.departures.length} departures a day, about ${formatHours(route.city.hours, lang)}. Fares from ${pkr(lowestFare(route))}.`),
  );
  if (!route) return <NotFound />;

  const faq = routeFaq(route, lang);
  const photo = cityImage(route.city.id, "card");
  const reverse = allRoutes.find((r) => r.from.id === route.to.id && r.to.id === route.from.id);
  const others = allRoutes.filter((r) => r.direction === route.direction && r.slug !== route.slug).slice(0, 2);
  const h1 = lang === "ur" ? `${title} بس` : `${title} bus`;

  return (
    <div className="container-nk py-10">
      <Breadcrumbs lang={lang} items={[{ name: u("navFleet", lang), path: "/fleet" }, { name: title }]} />

      {photo && (
        <div className="mb-8">
          <TownBanner id={route.city.id}>
            {/* Airport-style codes in English; Urdu readers get the town names instead. */}
            <span className={`absolute start-3 top-3 rounded-full bg-black/80 px-3 py-1 text-xs font-bold text-gold-bright ${lang === "ur" ? "" : "ltr tracking-widest"}`}>
              {lang === "ur"
                ? `${route.from.name.ur} ${arrow(lang)} ${route.to.name.ur}`
                : `${route.from.id.slice(0, 3).toUpperCase()} → ${route.to.id.slice(0, 3).toUpperCase()}`}
            </span>
          </TownBanner>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-gold-light">{u("since", lang)}</p>
          <h1 className="h1 mt-1">{h1}</h1>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {!photo && <h1 className="h1">{h1}</h1>}
          <p className="lead mt-4">{routeIntro(route, lang)}</p>
          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { k: u("fromFare", lang) + " " + u("fare", lang), v: pkr(lowestFare(route)) + (PLACEHOLDER ? "*" : "") },
              { k: u("duration", lang), v: formatHours(route.city.hours, lang) },
              { k: u("distance", lang), v: `${route.city.distanceKm} ${u("km", lang)}` },
            ].map((s) => (
              <div key={s.k} className="card !p-3">
                <dt className="text-xs text-mute">{s.k}</dt>
                <dd className="mt-1 font-semibold text-gold-light">
                  <span className="ltr">{s.v}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <RouteBookBox lang={lang} from={route.from.name[lang]} to={route.to.name[lang]} fromId={route.from.id} toId={route.to.id} />
          <p className="mt-3 text-sm text-mute">
            {u("cargoRouteLine", lang)}{" "}
            <Link to={href(lang, "/cargo")} className="font-semibold text-gold-light underline underline-offset-4">{u("cargoStripLink", lang)}</Link>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PlaceholderNote lang={lang} />
      </div>

      {/* Fares */}
      <section className="mt-10" aria-labelledby="fares">
        <h2 id="fares" className="h2">{u("fares", lang)}</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[420px] text-start">
            <thead className="bg-coal text-sm text-mute">
              <tr>
                <th className="p-3 text-start font-medium">{u("busType", lang)}</th>
                <th className="p-3 text-start font-medium">
                  {u("fare", lang)} ({u("perSeat", lang)})
                </th>
              </tr>
            </thead>
            <tbody>
              {route.fares.map((f) => (
                <tr key={f.type} className="border-t border-line">
                  <td className="p-3">{busTypes.find((x) => x.id === f.type).name[lang]}</td>
                  <td className="ltr p-3 font-semibold text-gold-light">
                    {pkr(f.pkr)}
                    {PLACEHOLDER && <sup>*</sup>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Timings */}
      <section className="mt-10" aria-labelledby="timings">
        <h2 id="timings" className="h2">{u("timings", lang)}</h2>
        <p className="mt-2 text-mute">{title}</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {route.departures.map((d) => (
            <li key={d} className="card !p-3 text-center font-semibold">
              <time dateTime={d}>{formatTime(d, lang)}</time>
              {PLACEHOLDER && <sup className="text-mute">*</sup>}
            </li>
          ))}
        </ul>
      </section>

      {/* Bus types */}
      <section className="mt-10" aria-labelledby="bus-types">
        <h2 id="bus-types" className="h2">{u("busTypes", lang)}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {busTypes
            .filter((b) => route.fares.some((f) => f.type === b.id))
            .map((b) => (
              <div key={b.id} className="card">
                <h3 className="h3 text-gold-light">{b.name[lang]}</h3>
                <p className="mt-1 text-sm text-mute">{b.blurb[lang]}</p>
                <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
                  {b.features.map((f, i) => (
                    <li key={i}>{f[lang]}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      {/* Terminals */}
      <section className="mt-10" aria-labelledby="boarding">
        <h2 id="boarding" className="h2">{u("boardingAt", lang)}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {boardingTerminals(route).map((t) => (
            <TerminalCard key={t.id} terminal={t} lang={lang} />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10" aria-labelledby="faq">
        <h2 id="faq" className="h2">{u("faq", lang)}</h2>
        <div className="mt-4 space-y-3">
          {faq.map((f, i) => (
            <details key={i} className="card" open={i === 0}>
              <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{f.q}</summary>
              <p className="mt-3 text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mt-10">
        <h2 className="h2">{u("relatedRoutes", lang)}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reverse && <RouteCard route={reverse} lang={lang} />}
          {others.map((r) => (
            <RouteCard key={r.slug} route={r} lang={lang} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Every way to reach a town: /routes/to/multan. */
export function BusToPage() {
  const lang = useLang();
  const { city: id } = useParams();
  const routes = routesTo(id);
  const to = routes[0]?.to;
  const name = to?.name[lang];
  const title = lang === "ur" ? `${name} کی بس` : `Bus to ${name}`;
  usePageMeta(
    to ? (lang === "ur" ? `${name} کی بس: کرایہ، اوقات اور بکنگ` : `Bus to ${name}: Fares, Timings & Booking`) : notFoundTitle(lang),
    to &&
      (lang === "ur"
        ? `${name} کے لیے نیو خان کی اے سی بس۔ کرایہ، اوقات اور بکنگ۔`
        : `New Khan buses to ${name}. Choose where you are leaving from to see fares and timings, and book a seat.`),
  );
  if (!to) return <NotFound />;

  const priced = routes.map((r) => ({
    priced: true,
    slug: r.slug,
    fromId: r.from.id,
    fromName: r.from.name[lang],
    hours: formatHours(r.city.hours, lang),
    distance: `${r.city.distanceKm} ${u("km", lang)}`,
    via: r.city.via[lang],
    lowest: pkr(lowestFare(r)),
    fares: r.fares.map((f) => ({ type: busTypes.find((b) => b.id === f.type).name[lang], price: pkr(f.pkr) })),
    departures: r.departures.map((d) => ({ value: d, label: formatTime(d, lang) })),
  }));
  // Towns on the same map line with no fares or times on file yet: listed, price to be confirmed.
  const unpriced = mapOriginsTo(id).map((o) => ({ priced: false, slug: "", fromId: o.id, fromName: o.name[lang], hours: "", distance: "", via: "", lowest: "", fares: [], departures: [] }));

  return (
    <div className="container-nk py-10">
      <Breadcrumbs lang={lang} items={[{ name: u("navFleet", lang), path: "/fleet" }, { name: title }]} />
      {cityImage(id, "card") && (
        <div className="mb-8">
          <TownBanner id={id} />
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-light">{u("since", lang)}</p>
      <h1 className="h1 mt-1">{title}</h1>
      <div className="mt-6">
        <PlaceholderNote lang={lang} />
      </div>
      <div className="mt-8">
        <DestinationExplorer key={`${lang}-${id}`} lang={lang} toId={id} toName={name} options={[...priced, ...unpriced]} placeholder={PLACEHOLDER} />
      </div>
    </div>
  );
}
