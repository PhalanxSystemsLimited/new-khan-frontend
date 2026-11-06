import { company } from "../data/site";
import { u } from "../lib/i18n";
import { resolveFields } from "../lib/forms";
import { whatsappLink } from "../lib/links";
import { EnquiryForm } from "./EnquiryForm";
import { Breadcrumbs } from "./parts";

/** Shared layout for the Charter and Cargo pages: photo banner with the title, intro, form, and a contact card. */
export function EnquiryPage({ lang, kind, navLabel, title, intro, aside, banner }) {
  return (
    <div className="container-nk py-10">
      <Breadcrumbs lang={lang} items={[{ name: navLabel }]} />
      {banner && (
        <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-3xl border-2 border-black sm:aspect-[21/7]">
          <img src={banner.src} alt={banner.alt} className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <h1 className="font-display absolute inset-x-0 bottom-0 p-5 text-3xl font-bold leading-tight text-white sm:p-8 sm:text-5xl">{title}</h1>
        </div>
      )}
      {!banner && <h1 className="h1">{title}</h1>}
      <p className="lead mt-3 max-w-2xl">{intro}</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <EnquiryForm lang={lang} kind={kind} fields={resolveFields(kind, lang)} />
        <aside className="card h-fit">
          <h2 className="h3 text-gold-light">{u("helpline", lang)}</h2>
          <p className="mt-2">
            <a href={`tel:${company.helplineTel}`} className="ltr text-xl font-semibold">{company.helpline}</a>
          </p>
          <p className="text-sm text-mute">{company.helplineHours[lang]}</p>
          <p className="mt-3 text-sm">
            <a href={`mailto:${company.email}`} className="ltr text-gold-light">{company.email}</a>
          </p>
          <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="btn btn-ghost mt-4 w-full">{lang === "ur" ? "واٹس ایپ" : "WhatsApp"}</a>
          {aside}
        </aside>
      </div>
    </div>
  );
}
