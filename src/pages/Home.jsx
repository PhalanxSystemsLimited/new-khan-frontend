import { Link } from "react-router-dom";
import { BookingSearch } from "../booking/BookingSearch";
import { FamilySection, JourneySection, ParcelsSection } from "../components/BookingSections";
import { DepartureBoard } from "../components/DepartureBoard";
import { AutoVideo, useHeroFit } from "../components/motion";
import { PlaceholderNote, SectionHead, usePageMeta, xt } from "../components/parts";
import { RouteMap } from "../components/RouteMap";
import { company, generalFaq, promises } from "../data/site";
import { href, telLink, whatsappLink } from "../lib/links";
import { useLang } from "../lib/useLang";

/** Home page, Pakka design: paper hero beside the coach, promises, departure board and route map as dark "screens". */
export default function Home() {
  const lang = useLang();
  usePageMeta();
  const ur = lang === "ur";
  const heroRef = useHeroFit();

  return (
    <>
      {/* Hero: headline and search beside the coach video with a ticket stub; on laptops the booking bar runs full width beneath */}
      <section className="pk-hero">
        <div className="container-nk pk-hero-in" ref={heroRef}>
          <div className="pk-hero-text">
            <p className="pk-eyebrow enter">{xt(lang, "New Khan · since 1956", "نیو خان · 1956 سے")}</p>
            {!ur && (
              <p className="pk-hero-ur enter" lang="ur" style={{ "--d": 1 }}>پکی سیٹ۔ پکا ٹکٹ۔</p>
            )}
            <h1 className="enter" style={{ "--d": 2 }}>
              {xt(lang, "Your seat.", "پکی سیٹ۔")}
              <br />
              <span className="pk-underline">
                {xt(lang, "Your ticket.", "پکا ٹکٹ۔")}
                <svg aria-hidden viewBox="0 0 300 16" preserveAspectRatio="none">
                  <path d="M3,10 C60,3 140,4 297,7 M14,14 C90,9 180,10 270,12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="pk-lead enter" style={{ "--d": 3 }}>
              {xt(
                lang,
                "Daily AC coaches from Lahore and Multan to Mianwali, Esakhel and DI Khan. Every booking gets a ticket number, and the counter honours it.",
                "لاہور اور ملتان سے میانوالی، عیسیٰ خیل اور ڈیرہ اسماعیل خان کے لیے روزانہ اے سی کوچیں۔ ہر بکنگ کا ٹکٹ نمبر، اور کاؤنٹر اس کی پاسداری کرتا ہے۔",
              )}
            </p>
            <div className="pk-search pk-search-card enter" style={{ "--d": 4 }}>
              <BookingSearch lang={lang} idp="pk" />
            </div>
            <p className="pk-small">
              {xt(lang, "Or call", "یا کال کریں")}{" "}
              <a href={telLink} className="ltr"><b>{company.helpline}</b></a> ·{" "}
              <a href={whatsappLink(lang)} target="_blank" rel="noopener"><b>{xt(lang, "book on WhatsApp", "واٹس ایپ پر بُک کریں")}</b></a>
            </p>
          </div>

          <div className="pk-hero-media">
            <div className="pk-frame pk-video">
              <img src="/images/hero-coach.webp" alt="" fetchPriority="high" />
              <AutoVideo src="/images/hero-coach.mp4" className="absolute inset-0 h-full w-full object-cover object-[62%_50%]" />
            </div>
            {/* A ticket stub laid over the photo: the promise in one object */}
            <div className="pk-stub pk-card">
              <div className="pk-stub-main">
                <span className="pk-k">{xt(lang, "Ticket number", "ٹکٹ نمبر")}</span>
                <span className="pk-tno ltr">NK-[000000]</span>
                <span className="pk-stub-route">{xt(lang, "Lahore → Mianwali · Seats 7, 8", "لاہور ← میانوالی · سیٹیں 7، 8")}</span>
              </div>
              <span className="pk-perf" />
              <div className="pk-stub-side">
                <span className="pk-badge" style={{ background: "#e9b23a" }}>1</span>
                <span className="pk-k">{xt(lang, "Show at counter", "کاؤنٹر پر دکھائیں")}</span>
              </div>
            </div>
          </div>

          <div className="pk-search pk-search-bar enter" style={{ "--d": 5 }}>
            <BookingSearch lang={lang} variant="bar" idp="pkd" />
          </div>
        </div>
      </section>

      {/* Four promises */}
      <section className="pk-band-wash">
        <div className="container-nk">
          <div className="pk-promises">
            {promises.map((p, i) => (
              <div key={i}>
                <span className="pk-num">{i + 1}</span>
                <h3>{p.title[lang]}</h3>
                {!ur && <p className="pk-ur" lang="ur">{p.title.ur}</p>}
                <p className="pk-body">{p.body[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departure board, in a dark screen */}
      <section className="pk-section">
        <div className="container-nk">
          <SectionHead eyebrow={xt(lang, "Departures", "روانگیاں")} title={xt(lang, "Leaving Lahore today", "آج لاہور سے روانگی")} ur="آج لاہور سے روانگی" />
          <div className="pk-screen">
            <DepartureBoard lang={lang} />
          </div>
        </div>
      </section>

      {/* Route map, in a dark screen */}
      <section className="pk-section">
        <div className="container-nk">
          <SectionHead
            eyebrow={xt(lang, "Routes", "روٹس")}
            title={xt(lang, "Where to next?", "آپ کہاں جانا چاہتے ہیں؟")}
            lead={xt(lang, "Every route we run from Lahore and Multan, and every stop on the way.", "لاہور اور ملتان سے ہمارا ہر روٹ اور ہر اسٹاپ۔")}
            action={
              <Link to={href(lang, "/fleet#routes")} className="pk-btn">
                {xt(lang, "All routes and fares", "تمام روٹس اور کرائے")} →
              </Link>
            }
          />
          <div className="pk-screen pk-screen-pad">
            <RouteMap lang={lang} />
          </div>
          <div className="mt-4">
            <PlaceholderNote lang={lang} />
          </div>
        </div>
      </section>

      <ParcelsSection lang={lang} />
      <FamilySection lang={lang} />
      <JourneySection lang={lang} />

      {/* FAQ */}
      <section className="pk-section">
        <div className="container-nk" style={{ maxWidth: 860 }}>
          <SectionHead eyebrow={xt(lang, "Questions", "سوالات")} title={xt(lang, "Before you book", "بکنگ سے پہلے")} ur="بکنگ سے پہلے" />
          <div className="pk-faq">
            {generalFaq.map((f, i) => (
              <details key={i} className="pk-card">
                <summary>{f.q[lang]}</summary>
                <p>{f.a[lang]}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="pk-section">
        <div className="container-nk">
          <div className="pk-closing">
            <div>
              {!ur && <p className="pk-ur pk-closing-ur" lang="ur">اگلا سفر ہمارے ساتھ</p>}
              <h2>{xt(lang, "Your next journey starts here", "اگلا سفر ہمارے ساتھ")}</h2>
            </div>
            <div className="pk-closing-actions">
              <Link to={href(lang, "/book")} className="pk-btn pk-btn-white">{xt(lang, "Book a seat", "سیٹ بُک کریں")}</Link>
              <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="pk-btn pk-btn-outline">WhatsApp</a>
              <a href={telLink} className="ltr pk-closing-tel">{company.helpline}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
