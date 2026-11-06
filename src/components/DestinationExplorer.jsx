import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { company } from "../data/site";
import { ui } from "../lib/i18n";
import { href, whatsappLink } from "../lib/links";
import { CityPicker } from "./pickers";
import { RouteBookBox } from "./RouteBookBox";

/**
 * "Bus to X": pick where you are leaving from, then see fares, times and the booking box for that journey.
 * Every origin with a route to this town is listed. The choice is kept in ?from= so it can be shared.
 *
 * options: [{ priced, slug, fromId, fromName, hours, distance, via, lowest, fares: [{ type, price }], departures: [{ value, label }] }]
 */
export function DestinationExplorer({ lang, toId, toName, options, placeholder }) {
  const [params, setParams] = useSearchParams();
  const [fromId, setFromId] = useState(options[0].fromId);
  const t = (en, ur) => (lang === "ur" ? ur : en);

  useEffect(() => {
    const q = params.get("from");
    if (q && options.some((o) => o.fromId === q)) setFromId(q);
    // Read once on arrival; afterwards the picker drives ?from=.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const pick = (id) => {
    setFromId(id);
    const next = new URLSearchParams(params);
    next.set("from", id);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const o = options.find((x) => x.fromId === fromId) ?? options[0];
  const star = placeholder ? "*" : "";

  return (
    <div>
      {/* Same look as the home page search: a card with From and To. To is fixed to this page's town. */}
      <form onSubmit={(e) => e.preventDefault()} className="rounded-2xl border-2 border-black bg-white p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)] sm:p-5" aria-label={t(`Bus to ${toName}`, `${toName} کی بس`)}>
        <div className="grid gap-3 max-sm:grid-cols-[minmax(0,1fr)_44px] max-sm:gap-x-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="max-sm:col-start-1 max-sm:row-start-1">
            <label htmlFor="dx-from" className="label">{ui.from[lang]}</label>
            <CityPicker
              id="dx-from"
              label={ui.from[lang]}
              value={o.fromId}
              onChange={pick}
              options={options.map((x) => ({ id: x.fromId, name: { en: x.fromName, ur: x.fromName } }))}
              lang={lang}
              placeholder={t("Choose city", "شہر منتخب کریں")}
            />
          </div>
          <span aria-hidden className="flex items-center justify-center text-xl text-mute max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:mt-6 sm:mt-6 sm:min-h-12">
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">{lang === "ur" ? "←" : "→"}</span>
          </span>
          <div className="max-sm:col-start-1 max-sm:row-start-2">
            <span className="label">{ui.to[lang]}</span>
            <div className="field flex items-center gap-2 bg-[#eef0f2] font-semibold" aria-label={toName}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-gold-light">
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {toName}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-mute">
          {options.length === 1
            ? t(`One town has a New Khan bus to ${toName}.`, `${toName} کی بس ایک شہر سے چلتی ہے۔`)
            : t(`${options.length} towns have a New Khan bus to ${toName}.`, `${options.length} شہروں سے ${toName} کی بس چلتی ہے۔`)}
        </p>
      </form>

      {!o.priced ? (
        <div key={o.fromId} className="mt-6 max-w-xl" aria-live="polite">
          <h2 className="h2">{lang === "ur" ? `${o.fromName} سے ${toName}` : `${o.fromName} to ${toName}`}</h2>
          <div className="card mt-4 border-gold/40">
            <p className="font-semibold">{t("Fare and timings to be confirmed", "کرایہ اور اوقات تصدیق طلب ہیں")}</p>
            <p className="mt-1 text-sm text-mute">
              {t(
                `Our ${toName} buses also stop at ${o.fromName}. Ask us for the fare and the next departure.`,
                `${toName} کی ہماری بسیں ${o.fromName} پر بھی رکتی ہیں۔ کرایہ اور اگلی روانگی ہم سے پوچھ لیں۔`,
              )}
            </p>
            <a href={whatsappLink(lang, { from: o.fromName, to: toName, seats: 1 })} target="_blank" rel="noopener" className="btn btn-gold mt-4 w-full">
              {t("Ask on WhatsApp", "واٹس ایپ پر پوچھیں")}
            </a>
            <a href={`tel:${company.helplineTel}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-gold-light underline underline-offset-4">
              {ui.callHelpline[lang]} <span className="ltr ms-2">{company.helpline}</span>
            </a>
          </div>
        </div>
      ) : (
        <div key={o.fromId} className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]" aria-live="polite">
          <div>
            <h2 className="h2">{lang === "ur" ? `${o.fromName} سے ${toName}` : `${o.fromName} to ${toName}`}</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { k: `${ui.fromFare[lang]} ${ui.fare[lang]}`, v: o.lowest + star },
                { k: ui.duration[lang], v: o.hours },
                { k: ui.distance[lang], v: o.distance },
              ].map((s) => (
                <div key={s.k} className="card !p-3">
                  <dt className="text-xs text-mute">{s.k}</dt>
                  <dd className="mt-1 font-semibold text-gold-light">
                    <span className="ltr">{s.v}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-mute">{o.via}</p>

            <h3 className="h3 mt-8">{ui.fares[lang]}</h3>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-start">
                <tbody>
                  {o.fares.map((f) => (
                    <tr key={f.type} className="border-t border-line first:border-t-0">
                      <td className="p-3">{f.type}</td>
                      <td className="ltr p-3 text-end font-semibold text-gold-light">
                        {f.price}
                        {placeholder && <sup>*</sup>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="h3 mt-8">{ui.timings[lang]}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {o.departures.map((d) => (
                <li key={d.value} className="card !p-3 text-center font-semibold">
                  <time dateTime={d.value}>{d.label}</time>
                  {placeholder && <sup className="text-mute">*</sup>}
                </li>
              ))}
            </ul>

            <Link to={href(lang, `/routes/${o.slug}`)} className="mt-6 inline-flex min-h-11 items-center font-semibold text-gold-light underline underline-offset-4">
              {t("Boarding points and full details", "سوار ہونے کے مقامات اور مکمل تفصیل")} {lang === "ur" ? "←" : "→"}
            </Link>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <RouteBookBox lang={lang} from={o.fromName} to={toName} fromId={o.fromId} toId={toId} />
          </div>
        </div>
      )}
    </div>
  );
}
