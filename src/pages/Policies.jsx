import { Link } from "react-router-dom";
import { Icon } from "../components/icons";
import { PageHero } from "../components/PageHero";
import { usePageMeta } from "../components/parts";
import { BusinessDetails, LegalDocBody, PolicyNav, PolicyPage, docHref } from "../components/PolicyPage";
import { legalDoc, legalDocs, legalUpdated } from "../data/legal";
import { u } from "../lib/i18n";
import { arrow, href } from "../lib/links";
import { useLang } from "../lib/useLang";

const docIcon = { refund: "refund", shipping: "ticket", travel: "bag", privacy: "shield", terms: "check" };
/** The passenger policies shown in full on this page; privacy and terms have their own pages. */
const onThisPage = ["refund", "shipping", "travel"];

export default function Policies() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "پالیسیاں: ریفنڈ، سروس کی فراہمی، رازداری اور شرائط" : "Policies: refunds, service delivery, privacy and terms",
    ur
      ? "نیو خان کی ریفنڈ اور منسوخی، سروس کی فراہمی، سامان اور حفاظت، رازداری کی پالیسیاں اور شرائط و ضوابط۔"
      : "New Khan's refund and cancellation, service delivery, luggage and safety, and privacy policies, and terms and conditions.",
  );

  return (
    <>
      <PageHero
        lang={lang}
        crumbs={[{ name: u("navPolicies", lang) }]}
        eyebrow={u("navPolicies", lang)}
        title={ur ? "صاف اصول، سادہ الفاظ میں" : "Clear rules, in plain words"}
        lead={ur ? "ریفنڈ، ٹکٹ کی فراہمی، سامان، رازداری اور شرائط: سفر سے پہلے سب کچھ معلوم ہو۔" : "Refunds, how your ticket reaches you, luggage, privacy and terms: everything to know before you travel."}
        facts={[
          { value: String(legalDocs.length), label: ur ? "پالیسیاں" : "policies" },
          { value: legalUpdated[lang], label: ur ? "آخری تبدیلی" : "last updated" },
        ]}
      />

      <div className="container-nk grid grid-cols-[minmax(0,1fr)] gap-8 py-10 sm:py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <PolicyNav lang={lang} />

        <div className="min-w-0 space-y-10">
          {/* At a glance: one card per document */}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {legalDocs.map((d) => (
              <li key={d.id}>
                <Link to={href(lang, docHref(d.id))} className="group flex h-full flex-col rounded-2xl border-2 border-[#1b1e21] bg-white p-4 transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1b1e21]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1b1e21] text-gold-bright">
                    <Icon name={docIcon[d.id] ?? "check"} className="h-5 w-5" />
                  </span>
                  <span className="font-display mt-3 text-lg font-bold leading-snug text-black">{d.title[lang]}</span>
                  <span className="mt-1 flex-1 text-sm text-mute">{d.summary[lang]}</span>
                  <span className="mt-3 text-sm font-semibold text-gold-light group-hover:underline">
                    {ur ? "پڑھیں" : "Read"} {arrow(lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* The passenger policies in full */}
          {onThisPage.map((id) => {
            const d = legalDoc(id);
            return (
              <article key={id} id={id} className="scroll-mt-28 rounded-3xl border-2 border-[#1b1e21] bg-white p-5 shadow-[6px_6px_0_#1b1e21] sm:p-8">
                <header className="mb-6 flex items-start gap-3 border-b-2 border-dashed border-[#1b1e21]/15 pb-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b1e21] text-gold-bright">
                    <Icon name={docIcon[id] ?? "check"} className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold leading-tight text-black sm:text-3xl">{d.title[lang]}</h2>
                    <p className="mt-1 text-sm text-mute">{d.summary[lang]}</p>
                  </div>
                </header>
                <LegalDocBody doc={d} lang={lang} headingLevel="h3" />
              </article>
            );
          })}

          <BusinessDetails lang={lang} />
        </div>
      </div>
    </>
  );
}

export function Privacy() {
  const lang = useLang();
  const ur = lang === "ur";
  return (
    <PolicyPage
      lang={lang}
      id="privacy"
      metaTitle={ur ? "رازداری کی پالیسی" : "Privacy policy"}
      metaDescription={ur ? "نیو خان آپ کی معلومات کیسے جمع، استعمال اور محفوظ کرتا ہے۔" : "How New Khan collects, uses and protects your personal information."}
    />
  );
}

export function Terms() {
  const lang = useLang();
  const ur = lang === "ur";
  return (
    <PolicyPage
      lang={lang}
      id="terms"
      metaTitle={ur ? "شرائط و ضوابط" : "Terms and conditions"}
      metaDescription={ur ? "نیو خان کے ٹکٹ، چارٹر اور پارسل بکنگ کی شرائط و ضوابط۔" : "Terms and conditions for New Khan tickets, charters and parcels."}
    />
  );
}
