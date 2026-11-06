import { Link } from "react-router-dom";
import { legalDoc, legalDocs, legalUpdated } from "../data/legal";
import { company, officeAddress } from "../data/site";
import { u } from "../lib/i18n";
import { arrow, href, mailLink, telLink, whatsappLink } from "../lib/links";
import { PageHero } from "./PageHero";
import { usePageMeta } from "./parts";

/** Where each legal document lives: the three passenger policies on /policies, privacy and terms on their own pages. */
export const docHref = (id) => (id === "privacy" ? "/privacy" : id === "terms" ? "/terms" : `/policies#${id}`);

/** A legal document, set like a contract: numbered sections, paragraphs and lists, generous line height. */
export function LegalDocBody({ doc, lang, headingLevel = "h2" }) {
  const H = headingLevel;
  return (
    <ol className="space-y-7">
      {doc.sections.map((s, i) => (
        <li key={i} className="grid gap-2 sm:grid-cols-[2.25rem_1fr]">
          <span aria-hidden dir="ltr" className="hidden h-8 w-8 items-center justify-center rounded-full border-2 border-[#1b1e21] text-sm font-bold leading-none text-black sm:flex">{i + 1}</span>
          <div>
            <H className="font-display text-lg font-bold leading-snug text-black sm:text-xl">
              <span dir="ltr" className="sm:hidden">{i + 1}.&nbsp;</span>
              {s.h[lang]}
            </H>
            {/* A section's paragraphs come first, unless it also has a list: then the list, and the paragraph closes it */}
            {!s.list && s.p?.map((t, k) => <p key={k} className="mt-2 leading-relaxed text-[#3a3f45]">{t[lang]}</p>)}
            {s.list && (
              <ul className="mt-2 space-y-2">
                {s.list.map((t, k) => (
                  <li key={k} className="relative ps-5 leading-relaxed text-[#3a3f45]">
                    <span aria-hidden className="absolute top-[0.6em] h-1.5 w-1.5 rounded-full bg-[#1b1e21] [inset-inline-start:0.25rem]" />
                    {t[lang]}
                  </li>
                ))}
              </ul>
            )}
            {s.list && s.p?.map((t, k) => <p key={k} className="mt-3 leading-relaxed text-[#3a3f45]">{t[lang]}</p>)}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Every legal document, as a list of links: a sticky column on larger screens, a swipeable row on phones. */
export function PolicyNav({ lang, current }) {
  return (
    <nav aria-label={lang === "ur" ? "پالیسیاں" : "Policies"} className="min-w-0 lg:sticky lg:top-28 lg:self-start">
      <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-mute lg:block">{lang === "ur" ? "اس صفحے پر" : "Policies"}</p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:mt-3 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {legalDocs.map((d) => {
          const on = d.id === current;
          return (
            <li key={d.id} className="shrink-0">
              <Link
                to={href(lang, docHref(d.id))}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold lg:rounded-xl ${on ? "border-[#1b1e21] bg-[#1b1e21] text-white" : "border-[#1b1e21]/15 bg-white text-black hover:border-[#1b1e21]"}`}
              >
                {d.title[lang]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Who the business is and how to reach it, shown on every policy page (payment gateways look for it). */
export function BusinessDetails({ lang }) {
  const ur = lang === "ur";
  const rows = [
    { k: ur ? "کاروبار" : "Business", v: ur ? "نیو خان (انٹرسٹی بس سروس)" : "New Khan (intercity bus service)" },
    { k: ur ? "پتہ" : "Address", v: officeAddress(lang, { region: true }) },
    { k: u("helpline", lang), v: <a href={telLink} className="ltr font-semibold underline-offset-4 hover:underline">{company.helpline}</a> },
    { k: "WhatsApp", v: <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="ltr font-semibold underline-offset-4 hover:underline">{company.helpline}</a> },
    { k: ur ? "ای میل" : "Email", v: <a href={mailLink} className="ltr font-semibold underline-offset-4 hover:underline">{company.email}</a> },
    { k: ur ? "اوقات" : "Hours", v: company.helplineHours[lang] },
  ];
  return (
    <section aria-labelledby="business-details" className="rounded-2xl bg-[#0e1013] p-5 text-white sm:p-6">
      <h2 id="business-details" className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-bright">{ur ? "رابطہ اور کاروبار کی تفصیل" : "Contact and business details"}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.k}>
            <dt className="text-xs text-white/50">{r.k}</dt>
            <dd className="mt-0.5 text-white/90">{r.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A legal document on its own page (/privacy, /terms): the page hero, then the document beside the policy list. */
export function PolicyPage({ lang, id, metaTitle, metaDescription }) {
  const doc = legalDoc(id);
  usePageMeta(metaTitle, metaDescription);
  return (
    <>
      <PageHero
        lang={lang}
        crumbs={[{ name: u("navPolicies", lang), path: "/policies" }, { name: doc.title[lang] }]}
        eyebrow={u("navPolicies", lang)}
        title={doc.title[lang]}
        lead={doc.summary[lang]}
        facts={[{ value: legalUpdated[lang], label: lang === "ur" ? "آخری تبدیلی" : "last updated" }]}
      />
      <div className="container-nk grid grid-cols-[minmax(0,1fr)] gap-8 py-10 sm:py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <PolicyNav lang={lang} current={id} />
        <div className="min-w-0 space-y-8">
          <article className="rounded-3xl border-2 border-[#1b1e21] bg-white p-5 shadow-[6px_6px_0_#1b1e21] sm:p-8">
            <LegalDocBody doc={doc} lang={lang} />
          </article>
          <BusinessDetails lang={lang} />
          <Link to={href(lang, "/policies")} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold-light underline underline-offset-4">
            {lang === "ur" ? "تمام پالیسیاں" : "All policies"} {arrow(lang)}
          </Link>
        </div>
      </div>
    </>
  );
}
