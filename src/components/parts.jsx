import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PLACEHOLDER, company } from "../data/site";
import { u } from "../lib/i18n";
import { href, telLink, whatsappLink } from "../lib/links";
import { echo, hasUrdu } from "../lib/echo";

/** Transparent logo (1600 x 1092). Height drives the size. */
export function Logo({ height = 44, dark = false }) {
  return (
    <img
      src={dark ? "/new-khan-logo-dark-2026.png" : "/new-khan-logo-2026.png"}
      alt="New Khan"
      width={Math.round((height * 1600) / 1092)}
      height={height}
      style={{ height, width: "auto" }}
    />
  );
}

/** Shown while PLACEHOLDER is true. Remove by flipping the flag in src/data/site.js. */
export function PlaceholderNote({ lang, showConfirm = true, dark = false }) {
  if (!PLACEHOLDER) return null;
  return (
    <div role="note" className={`rounded-xl border p-4 text-sm ${dark ? "border-amber-400/50 bg-amber-400/10 text-amber-100" : "border-amber-400 bg-amber-50 text-amber-900"}`}>
      <strong>{u("placeholderTitle", lang)}: </strong>
      {u("placeholderBody", lang)}
      {showConfirm && (
        <>
          {" "}
          <a href={whatsappLink(lang)} className="font-semibold underline">
            {u("confirmOnWhatsapp", lang)}
          </a>
        </>
      )}
    </div>
  );
}

export function WhatsappIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.4-.7-2.3-1.2-3.2-2.7-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * The primary call to action: "Book a seat" opens the booking search; WhatsApp and the helpline are the fallbacks.
 * tone="dark" is for use over photos and black sections.
 */
export function BookActions({ lang, full = false, fallbacks = true, tone = "light" }) {
  return (
    <div className={full ? "w-full" : ""}>
      <Link to={href(lang, "/book")} className={`btn btn-gold btn-shine ${full ? "w-full text-lg" : ""}`} data-cta="book-a-seat">
        {u("book", lang)}
      </Link>
      {fallbacks && (
        <p className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${tone === "dark" ? "text-white/80" : "text-mute"}`}>
          <span>{u("orBookVia", lang)}</span>
          <a href={whatsappLink(lang)} target="_blank" rel="noopener" className={`inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4 ${tone === "dark" ? "text-gold-bright" : "text-gold-light"}`}>
            <WhatsappIcon /> {lang === "ur" ? "واٹس ایپ" : "WhatsApp"}
          </a>
          <a href={telLink} className={`inline-flex min-h-11 items-center font-semibold underline underline-offset-4 ${tone === "dark" ? "text-gold-bright" : "text-gold-light"}`}>
            {u("callHelpline", lang)} <span className="ltr ms-1">{company.helpline}</span>
          </a>
        </p>
      )}
    </div>
  );
}

/** Pick the English or Urdu string. */
export const xt = (lang, en, ur) => (lang === "ur" ? ur : en);

/**
 * The Urdu "echo" printed small under an English heading. Hidden on Urdu pages by CSS (the heading is
 * already Urdu there). `ur` overrides the dictionary.
 */
export function Echo({ text, ur }) {
  if (hasUrdu(text)) return null;
  const u = ur ?? echo[text];
  return u ? (
    <span className="pk-echo" lang="ur">
      {u}
    </span>
  ) : null;
}

/** Pakka section heading: eyebrow (optionally numbered), title with its Urdu echo, lead, and an action. */
export function SectionHead({ eyebrow, title, lead, action, dark = false, n, ur }) {
  return (
    <div className={`pk-head ${dark ? "pk-head-dark" : ""}`}>
      <div className="pk-head-main">
        {eyebrow && (
          <p className="pk-eyebrow">
            {n && <span className="pk-n ltr">{n}</span>}
            {eyebrow}
          </p>
        )}
        <h2>
          {title}
          <Echo text={title} ur={ur} />
        </h2>
        {lead && <p className="pk-lead">{lead}</p>}
      </div>
      {action && <div className="pk-head-action">{action}</div>}
    </div>
  );
}

/** Breadcrumb trail for pages without a page hero (route pages, Cargo, Charter). Home is added first. */
export function Breadcrumbs({ lang, items }) {
  const trail = items[0]?.path === "/" ? items : [{ name: xt(lang, "Home", "ہوم"), path: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="pk-crumbs" style={{ marginBottom: 12 }}>
      {trail.map((it, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {it.path && i < trail.length - 1 ? (
            <Link to={href(lang, it.path)}>{it.name}</Link>
          ) : (
            <span aria-current={i === trail.length - 1 ? "page" : undefined}>{it.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Sets the browser tab title ("<title> | New Khan") and the meta description for a page. */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | New Khan` : "New Khan | Intercity AC buses since 1956";
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}
