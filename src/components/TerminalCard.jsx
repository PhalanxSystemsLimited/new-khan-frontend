import { mapRoutes, mapStops } from "../data/routeMap";
import { PLACEHOLDER, company, stopKindLabel } from "../data/site";
import { u } from "../lib/i18n";
import { mapsLink } from "../lib/links";
import { Icon } from "./icons";

/** The kind of stop a terminal is on the network (main terminal, counter, office), from the route map. */
const kindOf = (id) => Object.values(mapStops).find((s) => (s.cityId ?? "lahore") === id)?.kind ?? "terminal";

/** Which numbered routes call at a terminal, so each card can show their coloured badges. */
const routesAt = (id) => {
  const key = Object.entries(mapStops).find(([, s]) => (s.cityId ?? "lahore") === id)?.[0];
  return key ? mapRoutes.filter((r) => r.stops.includes(key)) : [];
};

/**
 * One terminal or counter: city, what kind of stop it is, the routes that call there, address and hours,
 * and two actions (map, call). Used on the Terminals page and on every route page.
 */
export function TerminalCard({ terminal: t, lang }) {
  const routes = routesAt(t.id);
  const tel = `tel:${t.phone.replace(/\s/g, "")}`;
  return (
    <article id={t.id} className="scroll-mt-28 flex flex-col rounded-2xl border-2 border-[#1b1e21] bg-white p-4 shadow-[4px_4px_0_#1b1e21] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">{stopKindLabel[kindOf(t.id)][lang]}</p>
          <h3 className="font-display mt-0.5 text-2xl font-bold leading-tight text-black">{t.city[lang]}</h3>
        </div>
        {routes.length > 0 && (
          <ul className="flex shrink-0 gap-1" aria-label={lang === "ur" ? "یہاں رکنے والے روٹس" : "Routes that stop here"}>
            {routes.map((r) => (
              <li key={r.id} className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#0e1013]" style={{ background: r.color, boxShadow: `0 0 0 2px #ffffff, 0 0 0 3.5px ${r.color}` }}>
                {r.num}
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-4 grid gap-2.5 text-sm">
        <div className="flex gap-2.5">
          <dt className="sr-only">{u("address", lang)}</dt>
          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
          <dd className="text-black">
            {t.address[lang]}
            {PLACEHOLDER && !t.addressConfirmed && <span className="ms-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">{u("placeholderTitle", lang)}</span>}
          </dd>
        </div>
        <div className="flex gap-2.5">
          <dt className="sr-only">{u("hours", lang)}</dt>
          <Icon name="route" className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
          <dd className="text-mute">{t.hours[lang]}</dd>
        </div>
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <a href={mapsLink(t.mapQuery, t.mapUrl)} target="_blank" rel="noopener" className="btn !min-h-11 border-2 border-[#1b1e21] !px-3 text-sm text-black hover:bg-[#eef0f2]">
          {lang === "ur" ? "نقشہ" : "Map"}
        </a>
        <a href={tel} className="btn !min-h-11 bg-[#1b1e21] !px-3 text-sm text-white hover:bg-black">
          <span className="sr-only">{u("phone", lang)}: </span>
          {lang === "ur" ? "کال کریں" : "Call"}
          <span className="ltr hidden text-white/70 sm:inline">{t.phone === company.helpline ? "" : t.phone}</span>
        </a>
      </div>
    </article>
  );
}
