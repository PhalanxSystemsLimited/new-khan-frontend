import { Link } from "react-router-dom";
import { PLACEHOLDER } from "../data/site";
import { u } from "../lib/i18n";
import { href } from "../lib/links";
import { cityImage, formatHours, lowestFare, pkr, routeTitle } from "../lib/routes";

/** Route card: town photo with the fare on it, journey facts, and two clear actions. */
export function RouteCard({ route, lang }) {
  const img = cityImage(route.city.id, "card");
  const to = href(lang, `/routes/${route.slug}`);
  return (
    <article className="lift group overflow-hidden rounded-2xl border-2 border-black bg-white shadow-sm">
      <Link to={to} className="relative block aspect-[16/10] overflow-hidden bg-gradient-to-br from-gold-dark via-neutral-900 to-black" tabIndex={-1} aria-hidden>
        {img && <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_65%] transition-transform duration-700 group-hover:scale-105" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="ltr absolute end-3 top-3 rounded-full bg-gold px-3 py-1 text-sm font-bold text-black shadow">
          {u("fromFare", lang)} {pkr(lowestFare(route))}
          {PLACEHOLDER && "*"}
        </span>
      </Link>
      <div className="p-4">
        <h3 className="h3 text-black">
          <Link to={to} className="hover:text-gold-light">{routeTitle(route, lang)}</Link>
        </h3>
        <p className="mt-1 text-sm text-mute">
          {formatHours(route.city.hours, lang)} · <span className="ltr">{route.departures.length}</span> {u("departures", lang)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={to} className="btn btn-ghost !min-h-11 !px-4 text-sm">{u("viewRoute", lang)}</Link>
          <Link to={href(lang, "/book")} className="btn btn-gold !min-h-11 !px-4 text-sm" data-cta="book-a-seat">{u("book", lang)}</Link>
        </div>
      </div>
    </article>
  );
}
