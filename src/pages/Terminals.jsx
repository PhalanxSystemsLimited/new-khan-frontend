import { Icon } from "../components/icons";
import { PageHero, PageSectionHead } from "../components/PageHero";
import { usePageMeta } from "../components/parts";
import { TerminalCard } from "../components/TerminalCard";
import { mapStops } from "../data/routeMap";
import { company, officeAddress, terminals } from "../data/site";
import { u } from "../lib/i18n";
import { arrow, mapsLink, telLink, whatsappLink } from "../lib/links";
import { useLang } from "../lib/useLang";

/** Three things to know before arriving at a terminal. */
const beforeYouGo = [
  { icon: "route", title: { en: "30 minutes early", ur: "30 منٹ پہلے" }, body: { en: "Boarding closes when the coach leaves; seats are not held.", ur: "بس روانہ ہوتے ہی سوار ہونا بند، سیٹ روکی نہیں جاتی۔" } },
  { icon: "ticket", title: { en: "Your ticket number", ur: "اپنا ٹکٹ نمبر" }, body: { en: "On your phone is fine. No printout needed.", ur: "فون پر دکھانا کافی ہے، پرنٹ کی ضرورت نہیں۔" } },
  { icon: "shield", title: { en: "Your CNIC", ur: "اپنا شناختی کارڈ" }, body: { en: "Or a B-form for children.", ur: "یا بچوں کے لیے ب فارم۔" } },
];

export default function Terminals() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "نیو خان ٹرمینلز: پتے، فون اور نقشے" : "New Khan terminals: addresses, phone and map",
    ur ? "نیو خان کے ٹرمینلز کے پتے، فون نمبر اور نقشہ۔ ہیڈ آفس: 55 لارنس روڈ، لاہور۔" : "Addresses, phone numbers and maps for every New Khan terminal. Head office: 55 Lawrence Road, Lahore.",
  );
  const head = terminals[0];
  const others = terminals.slice(1);
  const counters = Object.values(mapStops).filter((s) => s.kind !== "stop").length;

  return (
    <>
      <PageHero
        lang={lang}
        crumbs={[{ name: u("navTerminals", lang) }]}
        eyebrow={ur ? "ٹرمینلز اور کاؤنٹرز" : "Terminals and counters"}
        title={ur ? "جہاں سے سفر شروع ہوتا ہے" : "Where every trip begins"}
        lead={ur ? "ہر ٹرمینل کا پتہ، اوقات اور نقشہ، اور فون پر ایک ٹیپ میں رابطہ۔" : "Addresses, hours and maps for every terminal, and one tap to call."}
        facts={[
          { value: String(terminals.length), label: ur ? "ٹرمینلز" : "terminals" },
          { value: String(counters), label: ur ? "کاؤنٹر اور دفاتر" : "counters and offices" },
        ]}
      />

      {/* Head office: the one address everyone should know */}
      <section className="section pb-0">
        <div className="container-nk">
          <div id={head.id} className="grid scroll-mt-28 overflow-hidden rounded-3xl border-2 border-[#1b1e21] shadow-[6px_6px_0_#1b1e21] md:grid-cols-[1.2fr_1fr]">
            <div className="bg-white p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-light sm:text-sm">{ur ? "ہیڈ آفس اور مین ٹرمینل" : "Head office and main terminal"}</p>
              <h2 className="font-display mt-2 text-3xl font-bold text-black sm:text-4xl">{head.city[lang]}</h2>
              <p className="mt-3 text-lg text-[#3a3f45]">{officeAddress(lang, { region: true })}</p>
              <p className="mt-1 text-sm text-mute">{head.hours[lang]}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={mapsLink(head.mapQuery, head.mapUrl)} target="_blank" rel="noopener" className="btn btn-gold">
                  {u("openMap", lang)}
                </a>
                <a href={telLink} className="btn border-2 border-[#1b1e21] text-black hover:bg-[#eef0f2]">
                  <span className="ltr">{company.helpline}</span>
                </a>
              </div>
            </div>
            {/* A drawn pin on a dark street grid, standing in for a map */}
            <div aria-hidden className="relative min-h-[180px] overflow-hidden bg-[#121417]">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:34px_34px]" />
              <div className="absolute -inset-x-10 top-[46%] h-3 -rotate-6 bg-white/10" />
              <div className="absolute inset-y-0 left-[58%] w-2.5 rotate-3 bg-white/10" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                <span className="absolute left-1/2 top-[70%] h-16 w-16 -translate-x-1/2 animate-ping rounded-full bg-[#e9b23a]/25 motion-reduce:hidden" />
                <svg width="44" height="56" viewBox="0 0 44 56" className="relative drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
                  <path d="M22,54 C22,54 4,32 4,20 A18,18 0 1 1 40,20 C40,32 22,54 22,54 Z" fill="#e9b23a" stroke="#0e1013" strokeWidth="2.5" />
                  <circle cx="22" cy="20" r="7" fill="#0e1013" />
                </svg>
              </div>
              <p className="absolute inset-x-0 bottom-4 text-center font-hand text-xl font-bold text-white/80">{ur ? "55 لارنس روڈ" : "55 Lawrence Road"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Every other terminal */}
      <section className="section">
        <div className="container-nk">
          <PageSectionHead eyebrow={ur ? "ٹرمینلز" : "Terminals"} title={ur ? "ہر شہر میں ہمارا پتہ" : "Our address in every town"} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((t) => (
              <TerminalCard key={t.id} terminal={t} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      {/* Before you go */}
      <section className="section">
        <div className="container-nk">
          <div className="grid gap-6 rounded-3xl bg-[#0e1013] p-6 text-white sm:p-8 lg:grid-cols-[1fr_2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-bright sm:text-sm">{ur ? "روانگی سے پہلے" : "Before you go"}</p>
              <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">{ur ? "ٹرمینل پر یہ ساتھ لائیں" : "Bring these to the terminal"}</h2>
              <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold-bright underline underline-offset-4">
                {ur ? "کوئی سوال؟ واٹس ایپ کریں" : "A question? Message us on WhatsApp"} {arrow(lang)}
              </a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3">
              {beforeYouGo.map((b, i) => (
                <li key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Icon name={b.icon} className="h-6 w-6 text-gold-bright" />
                  <p className="mt-2 font-bold">{b.title[lang]}</p>
                  <p className="mt-1 text-sm text-white/65">{b.body[lang]}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
