import { Link } from "react-router-dom";
import { JourneySection, TeamSection } from "../components/AboutSections";
import { Icon } from "../components/icons";
import { PageHero, PageSectionHead } from "../components/PageHero";
import { BookActions, usePageMeta } from "../components/parts";
import { PLACEHOLDER, commitments, company, terminals } from "../data/site";
import { u } from "../lib/i18n";
import { arrow, href, telLink, whatsappLink } from "../lib/links";
import { useLang } from "../lib/useLang";

const icons = ["ticket", "shield", "refund", "headset"];
const sty = (i) => ({ "--i": i });

/**
 * About New Khan: who we are (banner and story), how we got here (the journey), what we promise,
 * the people who run it, the coaches we run today, and where to find us.
 */
export default function About() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "ہمارے بارے میں: 1956 سے آپ کے ہم سفر" : "About New Khan: carrying passengers since 1956",
    ur ? "نیو خان 1956 میں قائم ہوا اور 1983 سے اے سی بسیں چلا رہا ہے۔ ہیڈ آفس لاہور۔" : "New Khan was founded in 1956 and has run air-conditioned buses since 1983. Head office in Lahore.",
  );
  const year = new Date().getFullYear();
  const facts = [
    { value: String(company.founded), label: ur ? "قیام" : "Founded" },
    { value: String(company.acSince), label: ur ? "اے سی بسیں" : "AC since" },
    { value: String(year - company.founded), label: ur ? "سال کا سفر" : "Years on the road" },
    { value: String(company.fleet.ac), label: ur ? "اے سی کوچیں" : "AC coaches" },
  ];

  return (
    <>
      <PageHero
        lang={lang}
        crumbs={[{ name: u("navAbout", lang) }]}
        eyebrow={u("since", lang)}
        title={ur ? "1956 سے آپ کے سفر کا ساتھی" : "Your travel partner since 1956"}
        lead={ur ? "لاہور کی ایک سڑک سے پورے پنجاب تک، اب نئی اے سی کوچوں کے ساتھ۔" : "From one road out of Lahore to the whole of Punjab, now in new air-conditioned coaches."}
        facts={facts}
        image="/images/hero-coach.webp"
        imagePosition="62% 55%"
      />

      {/* Our story, beside a photo from the road today */}
      <section className="section">
        <div className="container-nk grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <PageSectionHead n="1" eyebrow={ur ? "ہماری کہانی" : "Our story"} title={ur ? "ستر سال، ایک ہی وعدہ" : "Seventy years, one promise"} />
            <div className="mt-5 space-y-4 text-lg leading-relaxed text-mute">
              <p className="reveal">
                {ur
                  ? "نیو خان پاکستان کی قدیم ترین انٹرسٹی بس کمپنیوں میں سے ایک ہے۔ ہم نے 1956 میں سفر شروع کیا اور 1983 میں اپنے روٹس پر ایئر کنڈیشنڈ بسیں متعارف کرائیں۔"
                  : "New Khan is one of Pakistan's long-running intercity bus companies. We started in 1956 and brought air-conditioned buses to our routes in 1983."}
              </p>
              <p className="reveal" style={sty(1)}>
                {ur
                  ? `ہمارا ہیڈ آفس ${company.addressUr.street}، ${company.addressUr.city} میں ہے۔ یہیں سے ہم لاہور سے سرگودھا، میانوالی، بھکر، ڈیرہ اسماعیل خان اور ملتان تک بسیں چلاتے ہیں۔`
                  : `Our head office is at ${company.address.street}, ${company.address.city}. From here we run to Sargodha, Mianwali, Bhakkar, DI Khan and Multan, and every stop on the way.`}
              </p>
            </div>
            <blockquote className="reveal mt-6 rounded-2xl border-2 border-[#1b1e21] bg-[#f5f6f7] p-5 shadow-[4px_4px_0_#1b1e21]" style={sty(2)}>
              <p className="font-display text-xl font-bold leading-snug text-black sm:text-2xl">
                {ur
                  ? "“آپ کی سیٹ پکی ہو، آپ کا ٹکٹ ہر کاؤنٹر پر مانا جائے، اور کوئی مسئلہ ہو تو فون اٹھانے والا موجود ہو۔”"
                  : "“Your seat is confirmed, your ticket is honoured, and when something goes wrong, someone picks up the phone.”"}
              </p>
            </blockquote>
          </div>
          <figure className="reveal-x">
            <div className="overflow-hidden rounded-3xl border-2 border-[#1b1e21] shadow-[6px_6px_0_#1b1e21]">
              <img src="/images/services/charter-2026.webp" alt={ur ? "مسافر نیو خان کی بس میں سوار ہو رہے ہیں" : "Passengers boarding a New Khan coach"} width={1600} height={1073} loading="lazy" decoding="async" className="h-auto w-full" />
            </div>
            <figcaption className="mt-3 text-xs text-mute">{ur ? "تصویر مثال کے طور پر ہے۔" : "Illustrative image."}</figcaption>
          </figure>
        </div>
        {PLACEHOLDER && (
          <p className="container-nk mt-8 text-sm text-amber-800">
            {ur ? "عارضی: یہ کہانی کمپنی کی اصل تاریخ، لوگوں اور تصاویر سے بدل دی جائے۔" : "Placeholder: replace this story with New Khan's own history, people and photographs."}
          </p>
        )}
      </section>

      <JourneySection lang={lang} />

      {/* What we promise */}
      <section className="section">
        <div className="container-nk">
          <PageSectionHead
            n="2"
            eyebrow={ur ? "ہمارا وعدہ" : "What we promise"}
            title={ur ? "ہر سفر پر یہ چار باتیں" : "Four things on every trip"}
            action={
              <Link to={href(lang, "/policies")} className="btn btn-ghost !min-h-11 !py-2 text-sm">
                {u("navPolicies", lang)} {arrow(lang)}
              </Link>
            }
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c, i) => (
              <li key={i} className="reveal ink-card lift flex flex-col p-5" style={sty(i)}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-gold-bright">
                  <Icon name={icons[i] ?? "check"} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold leading-snug text-black">{c.title[lang]}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mute">{c.body[lang]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Our people */}
      <div className="bg-coal">
        <TeamSection lang={lang} />
      </div>

      {/* The coaches we run today */}
      <section className="section">
        <div className="container-nk">
          <Link to={href(lang, "/fleet")} className="group relative block overflow-hidden rounded-3xl border-2 border-black">
            <div className="relative aspect-[4/3] sm:aspect-[21/8]">
              <img src="/images/fleet/fleet-row.webp" alt={ur ? "نیو خان کی نئی اے سی کوچیں" : "New Khan's new AC coaches"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[55%_55%] transition-transform duration-700 group-hover:scale-[1.03]" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-bright">{ur ? "آج کی بسیں" : "On the road today"}</p>
                  <p className="font-display mt-1 text-2xl font-bold text-white sm:text-4xl">
                    {ur ? `${company.fleet.ac} نئی اے سی کوچیں` : `${company.fleet.ac} new air-conditioned coaches`}
                  </p>
                </div>
                <span className="btn btn-gold !min-h-11 !py-2 text-sm">
                  {u("navFleet", lang)} {arrow(lang)}
                </span>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Where to find us */}
      <section className="section bg-black text-white">
        <div className="container-nk grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-bright">{ur ? "ہم یہاں ہیں" : "Find us"}</p>
            <h2 className="h2 mt-2 text-white">{ur ? "ہیڈ آفس اور ٹرمینلز" : "Head office and terminals"}</h2>
            <p className="mt-4 text-white/80">{ur ? `${company.addressUr.street}، ${company.addressUr.city}` : `${company.address.street}, ${company.address.city}`}</p>
            <p className="mt-1 text-white/80">
              {u("helpline", lang)}:{" "}
              <a href={telLink} className="ltr font-semibold text-gold-bright">{company.helpline}</a>
              <span className="mx-2 text-white/30">·</span>
              {company.helplineHours[lang]}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={href(lang, "/terminals")} className="btn btn-gold">
                {u("navTerminals", lang)} {arrow(lang)}
              </Link>
              <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="btn border border-white/30 text-white hover:bg-white/10">
                {ur ? "واٹس ایپ" : "WhatsApp"}
              </a>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {terminals.map((t) => (
              <li key={t.id}>
                <Link to={href(lang, `/terminals#${t.id}`)} className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold hover:border-white/40 hover:bg-white/10">
                  {t.city[lang]}
                  <span aria-hidden className="text-white/40">{arrow(lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container-nk mx-auto max-w-md text-center">
          <p className="font-display text-2xl font-bold text-black">{ur ? "اگلا سفر ہمارے ساتھ" : "Your next journey starts here"}</p>
          <div className="mt-5">
            <BookActions lang={lang} full />
          </div>
        </div>
      </section>
    </>
  );
}
