import { Link } from "react-router-dom";
import { heritage } from "../data/site";
import { href, whatsappLink } from "../lib/links";
import { Icon } from "./icons";
import { StageProgress } from "./motion";
import { SectionHead, xt } from "./parts";

/* Content as in the Pakka build. */
const parcelSteps = [
  { icon: "box", title: { en: "Hand it in", ur: "جمع کرائیں" }, body: { en: "At any New Khan terminal, described and weighed.", ur: "کسی بھی نیو خان ٹرمینل پر، تفصیل اور وزن کے ساتھ۔" } },
  { icon: "route", title: { en: "It rides with us", ur: "ہماری بس میں سفر" }, body: { en: "In the luggage hold of a scheduled coach.", ur: "شیڈول بس کے سامان والے خانے میں۔" } },
  { icon: "pin", title: { en: "Collect it", ur: "وصول کریں" }, body: { en: "At the other terminal, with the consignment number.", ur: "دوسرے ٹرمینل سے، کنسائنمنٹ نمبر دکھا کر۔" } },
];
const slipChips = [
  { en: "Exact item description", ur: "سامان کی درست تفصیل" },
  { en: "Weight in kg", ur: "وزن (کلو میں)" },
  { en: "Consignment number", ur: "کنسائنمنٹ نمبر" },
];
const familyTiles = [
  { icon: "seat", title: { en: "Sit together", ur: "ساتھ بیٹھیں" }, body: { en: "Pick seats side by side on the seat map.", ur: "سیٹ میپ پر ساتھ ساتھ سیٹیں چنیں۔" } },
  { icon: "ticket", title: { en: "Ticket on your phone", ur: "ٹکٹ آپ کے فون پر" }, body: { en: "Show the booking number at the counter. No printout.", ur: "کاؤنٹر پر بکنگ نمبر دکھائیں۔ پرنٹ کی ضرورت نہیں۔" } },
  { icon: "refund", title: { en: "Clear refunds", ur: "ریفنڈ کے صاف اصول" }, body: { en: "Written in plain words on the Policies page.", ur: "پالیسی کے صفحے پر سادہ الفاظ میں۔" } },
  { icon: "headset", title: { en: "Someone answers", ur: "ہم جواب دیتے ہیں" }, body: { en: "Helpline and WhatsApp, daily 8am to midnight.", ur: "ہیلپ لائن اور واٹس ایپ، روزانہ صبح 8 سے رات 12 تک۔" } },
];
const tilts = ["-1.6deg", "1.2deg", "-0.6deg"];

/** Parcels: the parcel's route as a vertical track (a box rides down it as you scroll), beside a consignment slip. */
export function ParcelsSection({ lang }) {
  const ur = lang === "ur";
  return (
    <section className="pk-section" id="parcels">
      <div className="container-nk">
        <SectionHead
          eyebrow={xt(lang, "Parcels & cargo", "پارسل اور کارگو")}
          title={xt(lang, "Send a parcel on our next coach", "پارسل اگلی بس سے بھیجیں")}
          ur="پارسل اگلی بس سے بھیجیں"
          lead={xt(lang, "Between any two New Khan terminals, on a scheduled coach. Priced by weight and size.", "کسی بھی دو نیو خان ٹرمینلز کے درمیان، شیڈول بس میں۔ وزن اور سائز کے حساب سے قیمت۔")}
        />
        <div className="pk-two">
          <div className="pk-card pk-pad">
            <StageProgress as="ol" step="li" className="pk-ptrack">
              <span className="pk-pbox" aria-hidden>
                <Icon name="box" className="pk-i16" />
              </span>
              {parcelSteps.map((st, i) => (
                <li key={i}>
                  <span className="pk-pdot"><Icon name={st.icon} className="pk-i18" /></span>
                  <div>
                    <p className="pk-step-k">{xt(lang, `Step ${i + 1}`, `مرحلہ ${i + 1}`)}</p>
                    <h3>{st.title[lang]}</h3>
                    {!ur && <p className="pk-ur pk-ur-s" lang="ur">{st.title.ur}</p>}
                    <p className="pk-body">{st.body[lang]}</p>
                  </div>
                </li>
              ))}
            </StageProgress>
          </div>

          <div className="pk-slip pk-card">
            <div className="pk-slip-top">
              <p className="pk-k">{xt(lang, "Consignment slip", "کنسائنمنٹ رسید")}</p>
              <p className="pk-tno ltr">CN-[000000]</p>
              <dl className="pk-slip-grid">
                <div><dt>{xt(lang, "From", "کہاں سے")}</dt><dd>{xt(lang, "Lahore", "لاہور")}</dd></div>
                <div><dt>{xt(lang, "To", "کہاں تک")}</dt><dd>{xt(lang, "Mianwali", "میانوالی")}</dd></div>
                <div><dt>{xt(lang, "Weight", "وزن")}</dt><dd className="ltr">[kg]</dd></div>
                <div><dt>{xt(lang, "Item", "سامان")}</dt><dd>{xt(lang, "[Description]", "[تفصیل]")}</dd></div>
              </dl>
            </div>
            <div className="pk-slip-perf" aria-hidden />
            <div className="pk-slip-bottom">
              <p className="pk-k">{xt(lang, "Every slip shows", "ہر رسید پر")}</p>
              <ul className="pk-chips">
                {slipChips.map((c, i) => <li key={i}>{c[lang]}</li>)}
              </ul>
              <p className="pk-body">
                {xt(lang, "Show the consignment number at the other terminal to collect, the same way a passenger shows a ticket number.", "وصولی کے لیے دوسرے ٹرمینل پر کنسائنمنٹ نمبر دکھائیں، جیسے مسافر ٹکٹ نمبر دکھاتا ہے۔")}
              </p>
              <div className="pk-row">
                <Link to={href(lang, "/cargo")} className="pk-btn pk-btn-ink">{xt(lang, "Send a parcel", "پارسل بھیجیں")}</Link>
                <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="pk-btn">{xt(lang, "Ask on WhatsApp", "واٹس ایپ پر پوچھیں")}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Family: a tall photo beside four tiles that light up one after another as you scroll. */
export function FamilySection({ lang }) {
  const ur = lang === "ur";
  return (
    <section className="pk-section">
      <div className="container-nk pk-two pk-family">
        <div className="pk-frame pk-family-photo">
          <img src="/images/journey/family-2026.webp" alt={xt(lang, "A family boarding a New Khan coach", "ایک فیملی نیو خان کی کوچ میں سوار ہو رہی ہے")} loading="lazy" decoding="async" />
          <span className="pk-tag">{xt(lang, "Illustrative image", "علامتی تصویر")}</span>
        </div>
        <div className="pk-family-text">
          <SectionHead eyebrow={xt(lang, "Travelling with us", "ہمارے ساتھ سفر")} title={xt(lang, "Easy for the whole family", "پوری فیملی کے لیے آسان سفر")} />
          <StageProgress step=".pk-ftile" className="pk-ftiles">
            {familyTiles.map((t, i) => (
              <div key={i} className="pk-ftile">
                <span className="pk-ficon"><Icon name={t.icon} className="pk-i20" /></span>
                <h3>{t.title[lang]}</h3>
                {!ur && <p className="pk-ur pk-ur-s" lang="ur">{t.title.ur}</p>}
                <p className="pk-body">{t.body[lang]}</p>
              </div>
            ))}
          </StageProgress>
          <div className="pk-row">
            <Link to={href(lang, "/book")} className="pk-btn pk-btn-ink">{xt(lang, "Book seats together", "ساتھ سیٹیں بُک کریں")}</Link>
            <Link to={href(lang, "/policies#travel")} className="pk-btn">{xt(lang, "Children and luggage rules", "بچوں اور سامان کے اصول")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Our journey: one road, three stops; each year lights up and its photo drops in as you scroll. */
export function JourneySection({ lang }) {
  return (
    <section className="pk-section">
      <div className="container-nk">
        <SectionHead
          eyebrow={xt(lang, "Since 1956", "1956 سے")}
          title={xt(lang, "Our journey", "ہمارا سفر")}
          lead={xt(lang, "Seventy years on the same roads out of Lahore.", "لاہور سے انہی سڑکوں پر ستر سال۔")}
        />
        <StageProgress step=".pk-jstop" className="pk-jtrack">
          {heritage.map((h, i) => {
            const today = h.year === "Today";
            return (
              <div key={h.year} className="pk-jstop" style={{ "--tilt": tilts[i] }}>
                <span className="pk-jyear ltr">{today ? xt(lang, "Today", "آج") : h.year}</span>
                <figure className="pk-pola">
                  {h.image && <img src={h.image} alt="" loading="lazy" decoding="async" className={today ? "" : "pk-old"} />}
                  <figcaption className="pk-body">{h.text[lang]}</figcaption>
                </figure>
              </div>
            );
          })}
        </StageProgress>
        <p className="pk-small" style={{ marginTop: 18 }}>
          {xt(lang, "Older photos are illustrative until archive photographs are added.", "پرانی تصاویر علامتی ہیں، اصل آرکائیو تصاویر بعد میں شامل ہوں گی۔")}
        </p>
      </div>
    </section>
  );
}
