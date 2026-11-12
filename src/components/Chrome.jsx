import { toast } from "./Toast";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { company } from "../data/site";
import { u } from "../lib/i18n";
import { href, telLink, whatsappLink } from "../lib/links";
import { WhatsappIcon, xt } from "./parts";
import { IS_LIVE } from "../booking/api";
import { signOut, useSession } from "../booking/auth";
import { AuthDialog } from "../booking/AuthDialog";
import { isStaffRole, useMe } from "../booking/useRole";

/* Navigation, as in the Pakka build: [path, English, Urdu]. */
const MAIN = [
  ["", "Home", "ہوم"],
  ["/fleet", "Fleet & Routes", "بسیں اور روٹس"],
  ["/terminals", "Terminals", "ٹرمینلز"],
  ["/book/my-bookings", "My bookings", "میری بکنگز"],
];
const SERVICES = [
  ["/cargo", "Parcels & cargo", "پارسل اور کارگو"],
  ["/charter", "Charter a bus", "بس کرائے پر لیں"],
  ["/book/manage", "Find a booking", "بکنگ تلاش کریں"],
];
const SERVICE_NOTES = {
  "/cargo": ["Send parcels on our coaches", "ہماری بسوں سے پارسل بھیجیں"],
  "/charter": ["Weddings, tours, company trips", "شادی، سیر، کمپنی کے دورے"],
  "/book/manage": ["Look up a ticket by mobile number", "موبائل نمبر سے ٹکٹ تلاش کریں"],
};
const MORE = [
  ["/about", "About", "ہمارے بارے میں"],
  ["/policies", "Policies", "پالیسیاں"],
];
const LANG_KEY = "nk_lang_choice";

/** The path after /en or /ur, e.g. "/book/manage" ("" for the home page). */
const usePagePath = () => useLocation().pathname.replace(/^\/(en|ur)/, "").replace(/\/$/, "");

/** Thin ink bar on top: the helpline, with the Urdu line beside it on English pages. */
export function TopBar({ lang }) {
  return (
    <div className="pk-bar">
      <div className="container-nk pk-bar-in">
        <span>
          <span className="pk-bar-long">{xt(lang, "Someone answers: helpline and WhatsApp", "ہیلپ لائن اور واٹس ایپ پر ہم جواب دیتے ہیں")}</span>
          <span className="pk-bar-short">{xt(lang, "Helpline & WhatsApp", "ہیلپ لائن اور واٹس ایپ")}</span>{" "}
          <a href={telLink} className="ltr">
            <b>{company.helpline}</b>
          </a>
        </span>
        {lang === "en" ? (
          <span className="pk-ur pk-bar-ur" lang="ur">ہیلپ لائن اور واٹس ایپ پر ہم جواب دیتے ہیں</span>
        ) : (
          <span>{company.helplineHours.ur}</span>
        )}
      </div>
    </div>
  );
}

/** Live mode only: sign in / sign out (booking on the real backend needs an account). */
function AccountButton({ lang }) {
  // Signed out: one "Sign in" button. Signed in: one button with the first name that opens a small menu
  // (My account, My bookings, Admin panel for staff, Sign out), so the header row never overflows.
  const session = useSession();
  const me = useMe();
  const role = me?.role ?? null;
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (!menu) return undefined;
    const key = (e) => e.key === "Escape" && setMenu(false);
    const click = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    document.addEventListener("keydown", key);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", click);
    };
  }, [menu]);

  if (!IS_LIVE) return null;
  if (!session) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="pk-btn pk-btn-s">
          {xt(lang, "Sign in", "سائن ان")}
        </button>
        <AuthDialog lang={lang} open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const first = (me?.fullName || "").trim().split(/\s+/)[0] || xt(lang, "Account", "اکاؤنٹ");
  const out = () => {
    setMenu(false);
    signOut().then(() => toast(xt(lang, "Signed out", "سائن آؤٹ ہو گیا"), { kind: "info", duration: 3000 }));
  };
  return (
    <div className="pk-dd pk-acct" ref={ref}>
      <button type="button" className="pk-btn pk-btn-s pk-acct-btn" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((v) => !v)}>
        <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
        <span className="pk-acct-name">{first}</span>
        <svg aria-hidden className="pk-acct-chev" viewBox="0 0 12 12" width="12" height="12">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {menu && (
        <div className="pk-dd-panel pk-acct-panel" role="menu">
          <div className="pk-acct-who">
            <b>{me?.fullName || xt(lang, "Signed in", "سائن ان")}</b>
            {me?.email && <span>{me.email}</span>}
          </div>
          <Link to={href(lang, "/account")} role="menuitem">
            <b>{xt(lang, "My account", "میرا اکاؤنٹ")}</b>
          </Link>
          <Link to={href(lang, "/book/my-bookings")} role="menuitem">
            <b>{xt(lang, "My bookings", "میری بکنگز")}</b>
          </Link>
          {isStaffRole(role) && (
            <Link to="/admin" role="menuitem">
              <b>{xt(lang, "Admin panel", "ایڈمن پینل")}</b>
            </Link>
          )}
          <button type="button" role="menuitem" className="pk-acct-out" onClick={out}>
            {xt(lang, "Sign out", "سائن آؤٹ")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ lang }) {
  const path = usePagePath();
  const { search, hash } = useLocation();
  const other = lang === "en" ? "ur" : "en";
  const [dd, setDd] = useState(false);
  const [menu, setMenu] = useState(false);
  const ddRef = useRef(null);

  const label = (item) => (lang === "ur" ? item[2] : item[1]);
  const isOn = (p) => (p === "" ? path === "" : path === p || (p === "/fleet" && path.startsWith("/routes")));
  const servicesOn = SERVICES.some(([p]) => isOn(p));

  // Close the dropdown and the phone menu on navigation, Escape, or a click elsewhere.
  useEffect(() => {
    setDd(false);
    setMenu(false);
  }, [path]);
  useEffect(() => {
    const key = (e) => e.key === "Escape" && (setDd(false), setMenu(false));
    const click = (e) => ddRef.current && !ddRef.current.contains(e.target) && setDd(false);
    document.addEventListener("keydown", key);
    document.addEventListener("click", click);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", click);
    };
  }, []);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  const navLink = (item) => (
    <Link key={item[0]} to={href(lang, item[0])} aria-current={isOn(item[0]) ? "page" : undefined}>
      {label(item)}
    </Link>
  );

  return (
    <header className="pk-header">
      <div className="container-nk pk-header-in">
        <Link to={href(lang)} className="pk-logo" aria-label="New Khan home">
          <img src="/new-khan-logo-2026.png" alt="New Khan" />
        </Link>
        <nav className="pk-nav" aria-label={xt(lang, "Main", "مینو")}>
          {MAIN.map(navLink)}
          <div className="pk-dd" ref={ddRef}>
            <button type="button" className={`pk-dd-btn ${servicesOn ? "is-on" : ""}`} aria-expanded={dd} aria-haspopup="true" onClick={() => setDd((v) => !v)}>
              {xt(lang, "Services", "سروسز")}
              <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {dd && (
              <div className="pk-dd-panel" role="menu">
                {SERVICES.map((s) => (
                  <Link key={s[0]} to={href(lang, s[0])} role="menuitem" aria-current={isOn(s[0]) ? "page" : undefined}>
                    <b>{label(s)}</b>
                    <span>{SERVICE_NOTES[s[0]][lang === "ur" ? 1 : 0]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {MORE.map(navLink)}
        </nav>
        <div className="pk-header-actions">
          <Link to={`/${other}${path}${search}${hash}`} className="pk-btn pk-btn-s pk-lang" lang={other} hrefLang={other}>
            {other === "ur" ? "اردو" : "English"}
          </Link>
          <AccountButton lang={lang} />
          <Link to={href(lang, "/book")} className="pk-btn pk-btn-s pk-btn-ink pk-book">
            {xt(lang, "Book a seat", "سیٹ بُک کریں")}
          </Link>
          <button type="button" className="pk-btn pk-btn-s pk-burger" aria-expanded={menu} aria-controls="pk-menu" aria-label={xt(lang, "Menu", "مینو")} onClick={() => setMenu((v) => !v)}>
            <svg aria-hidden viewBox="0 0 24 24" width="22" height="22">
              {menu ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {menu && (
        <div className="pk-menu" id="pk-menu">
          <nav className="container-nk pk-menu-in" aria-label={xt(lang, "Main", "مینو")}>
            {MAIN.map(navLink)}
            <p className="pk-menu-k">{xt(lang, "Services", "سروسز")}</p>
            {SERVICES.map((s) => (
              <Link key={s[0]} to={href(lang, s[0])} className="pk-menu-sub" aria-current={isOn(s[0]) ? "page" : undefined}>
                <b>{label(s)}</b>
                <span>{SERVICE_NOTES[s[0]][lang === "ur" ? 1 : 0]}</span>
              </Link>
            ))}
            <p className="pk-menu-k">{xt(lang, "New Khan", "نیو خان")}</p>
            {MORE.map(navLink)}
            <div className="pk-menu-actions">
              <Link to={href(lang, "/book")} className="pk-btn pk-btn-ink">{xt(lang, "Book a seat", "سیٹ بُک کریں")}</Link>
              <a href={telLink} className="pk-btn ltr">{company.helpline}</a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer({ lang }) {
  return (
    <footer className="pk-footer">
      <div className="container-nk pk-footer-in">
        <div>
          <img src="/new-khan-logo-2026.png" alt="New Khan" style={{ height: 44, width: "auto" }} />
          <p>{xt(lang, "Intercity AC coaches since 1956.", "1956 سے شہروں کے درمیان اے سی کوچیں۔")}</p>
        </div>
        <div>
          <b>{xt(lang, "Head office", "ہیڈ آفس")}</b>
          <p>{xt(lang, "55 Lawrence Road, Lahore, Punjab", "55 لارنس روڈ، لاہور، پنجاب")}</p>
          <p className="ltr">{company.email}</p>
        </div>
        <div>
          <b>{xt(lang, "Helpline and WhatsApp", "ہیلپ لائن اور واٹس ایپ")}</b>
          <p><a href={telLink} className="ltr">{company.helpline}</a></p>
          <p>{company.helplineHours[lang]}</p>
          <p><a href={whatsappLink(lang)} target="_blank" rel="noopener">{xt(lang, "Chat on WhatsApp", "واٹس ایپ پر بات کریں")}</a></p>
        </div>
        <div className="pk-footer-links">
          <b>{xt(lang, "Policies", "پالیسیاں")}</b>
          <Link to={href(lang, "/policies#refund")}>{xt(lang, "Refund and cancellation", "ریفنڈ اور منسوخی")}</Link>
          <Link to={href(lang, "/policies#shipping")}>{xt(lang, "Service delivery", "سروس کی فراہمی")}</Link>
          <Link to={href(lang, "/privacy")}>{xt(lang, "Privacy", "رازداری")}</Link>
          <Link to={href(lang, "/terms")}>{xt(lang, "Terms and conditions", "شرائط و ضوابط")}</Link>
        </div>
      </div>
    </footer>
  );
}

/** First visit: a centred dialog over the blurred page asks English or Urdu; the choice is remembered. */
export function LangDialog({ lang }) {
  const path = usePagePath();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let chosen = null;
    try {
      chosen = localStorage.getItem(LANG_KEY);
    } catch {
      // storage blocked: just ask
    }
    if (chosen) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);

  const remember = (l) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // storage blocked: the dialog will ask again next visit
    }
  };
  const choose = (l) => {
    remember(l);
    setOpen(false);
    if (l !== lang) navigate(`/${l}${path}${search}`);
  };
  const dismiss = () => {
    remember(lang);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const key = (e) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", key);
    document.querySelector(".pk-langpop-btns button")?.focus();
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  return (
    <div className="pk-langwrap" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="pk-langpop" role="dialog" aria-modal="true" aria-labelledby="pk-lang-t">
        <button type="button" className="pk-langpop-x" aria-label="Close" onClick={dismiss}>
          <svg aria-hidden viewBox="0 0 24 24" width="16" height="16">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <img src="/new-khan-logo-2026.png" alt="New Khan" className="pk-langpop-logo" />
        <p className="pk-langpop-t" id="pk-lang-t">Choose your language</p>
        <p className="pk-langpop-ur" lang="ur" dir="rtl">اپنی زبان منتخب کریں</p>
        <div className="pk-langpop-btns">
          <button type="button" className={`pk-btn ${lang === "en" ? "pk-btn-ink" : ""}`} onClick={() => choose("en")}>English</button>
          <button type="button" className={`pk-btn pk-langpop-urbtn ${lang === "ur" ? "pk-btn-ink" : ""}`} lang="ur" onClick={() => choose("ur")}>اردو</button>
        </div>
        <p className="pk-langpop-note">You can switch any time from the top of the page.</p>
      </div>
    </div>
  );
}

/** Always-visible thumb-reach bar on phones (unchanged from the live site). */
export function StickyBar({ lang }) {
  // Not on the booking screens: the search form is the page itself, and the bus list and seat map have their
  // own bottom bar (total + Continue). One bar at a time on phones.
  const { pathname } = useLocation();
  if (/\/book(\/(results|seats))?\/?$/.test(pathname)) return null;
  // Phones: also not while the customer is paying (the page has its own Pay button there).
  const paying = /\/book\/(reserved|pay|gateway)\/?$/.test(pathname);
  return (
    <div className={`nk-sticky ${paying ? "nk-sticky-paying" : ""} fixed inset-x-0 bottom-0 z-40 border-t-2 border-gold bg-white/95 p-3 backdrop-blur lg:hidden`}>
      <div className="mx-auto flex max-w-xl gap-3">
        <Link to={href(lang, "/book")} className="btn btn-gold flex-1" data-cta="book-a-seat">{u("book", lang)}</Link>
        <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="btn btn-ghost !px-4" aria-label={lang === "ur" ? "واٹس ایپ" : "WhatsApp"}>
          <WhatsappIcon />
        </a>
        <a href={telLink} className="btn btn-ghost" aria-label={u("callHelpline", lang)}>{u("call", lang)}</a>
      </div>
    </div>
  );
}

/** Floating WhatsApp bubble for larger screens (phones use the sticky bar). */
export function WhatsappFloat({ lang }) {
  return (
    <a
      href={whatsappLink(lang)}
      target="_blank"
      rel="noopener"
      aria-label={u("book", lang)}
      className="pulse fixed bottom-6 end-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 lg:flex"
    >
      <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.4-.7-2.3-1.2-3.2-2.7-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.7 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
      </svg>
    </a>
  );
}
