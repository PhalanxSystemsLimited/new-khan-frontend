import { Link } from "react-router-dom";
import { href } from "../lib/links";
import { Echo, SectionHead, xt } from "./parts";

/**
 * The header every inner page opens with (Terminals, Fleet & Routes, About, Policies), in the Pakka style:
 * breadcrumb, eyebrow, title with its Urdu echo, one line about the page, a few facts, and an optional photo.
 */
export function PageHero({ lang, crumbs, eyebrow, title, lead, facts = [], image, imagePosition = "50% 50%", children }) {
  return (
    <section className="pk-pagehero">
      <div className={`container-nk pk-pagehero-in ${image ? "has-img" : ""}`}>
        <div className="pk-pagehero-text">
          <nav aria-label="Breadcrumb" className="pk-crumbs">
            <Link to={href(lang)}>{xt(lang, "Home", "ہوم")}</Link>
            {crumbs.map((c, i) => (
              <span key={i}>
                {" / "}
                {c.path ? <Link to={href(lang, c.path)}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
              </span>
            ))}
          </nav>
          <p className="pk-eyebrow">{eyebrow}</p>
          <h1>
            {title}
            <Echo text={title} />
          </h1>
          {lead && <p className="pk-lead">{lead}</p>}
          {facts.length > 0 && (
            <dl className="pk-facts">
              {facts.map((f, i) => (
                <div key={i}>
                  <dd className="ltr">{f.value}</dd>
                  <dt>{f.label}</dt>
                </div>
              ))}
            </dl>
          )}
          {children}
        </div>
        {image && (
          <div className="pk-frame pk-pagehero-img">
            <img src={image} alt="" style={{ objectPosition: imagePosition }} />
          </div>
        )}
      </div>
    </section>
  );
}

/** Section heading inside inner pages: the Pakka section head (numbered eyebrow, title, lead, action). */
export function PageSectionHead({ n, eyebrow, title, lead, action }) {
  return <SectionHead n={n} eyebrow={eyebrow} title={title} lead={lead} action={action} />;
}
