import { EnquiryPage } from "../components/EnquiryPage";
import { usePageMeta } from "../components/parts";
import { cargoOrCharterNote } from "../data/site";
import { u } from "../lib/i18n";
import { useLang } from "../lib/useLang";

/** Parcels and cargo: send-a-parcel request with a consignment number and printable receipt. */
export function Cargo() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "کارگو اور پارسل کی درخواست" : "Cargo and parcel enquiry",
    ur ? "نیو خان کی بسوں پر لاہور اور دیگر شہروں کے درمیان پارسل اور کارگو بھیجیں۔" : "Send parcels and cargo on New Khan buses between Lahore and our other cities.",
  );
  return (
    <EnquiryPage
      lang={lang}
      kind="cargo"
      navLabel={u("navCargo", lang)}
      banner={{ src: "/images/services/cargo-2026.webp", alt: ur ? "ٹرمینل پر بس میں پارسل لوڈ ہو رہے ہیں" : "Terminal staff loading parcels into a coach" }}
      title={ur ? "کارگو اور پارسل" : "Cargo and parcels"}
      aside={
        <ul className="mt-5 list-disc space-y-2 border-t border-line ps-5 pt-4 text-sm text-mute">
          {(ur
            ? ["ہمارے ٹرمینلز کے درمیان شیڈول بسوں پر", "ریٹ وزن اور سائز کے حساب سے، فون یا واٹس ایپ پر", "سامان کی درست تفصیل اور کلوگرام میں وزن لکھیں"]
            : ["Between our terminals on scheduled buses", "Rate depends on weight and size, quoted by phone or WhatsApp", "Write the exact item and its weight in kg; both are printed on your receipt"]
          ).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      }
      intro={(ur ? "سامان کی درست تفصیل اور وزن لکھیں۔ آپ کو کنسائنمنٹ نمبر اور رسید ملے گی۔ " : "Tell us exactly what you are sending and its weight. You get a consignment number and a receipt that shows both. ") + cargoOrCharterNote[lang]}
    />
  );
}

/** Charter a bus: weddings, tours, teams and company trips. */
export function Charter() {
  const lang = useLang();
  const ur = lang === "ur";
  usePageMeta(
    ur ? "بس کرائے پر: چارٹر کی درخواست" : "Charter a bus: send an enquiry",
    ur ? "شادی، سیر، ٹیم یا کمپنی کے سفر کے لیے نیو خان کی اے سی بس کرائے پر لیں۔" : "Charter a New Khan AC bus for weddings, tours, teams and company trips.",
  );
  return (
    <EnquiryPage
      lang={lang}
      kind="charter"
      navLabel={u("navCharter", lang)}
      banner={{ src: "/images/services/charter-2026.webp", alt: ur ? "مسافر نیو خان کی بس میں سوار ہو رہے ہیں" : "A group boarding a New Khan coach" }}
      title={ur ? "بس کرائے پر لیں" : "Charter a bus"}
      intro={(ur ? "شادی، سیر، ٹیم یا کمپنی کے سفر کی تفصیل بھیجیں۔ " : "Tell us about your wedding, tour, team or company trip. ") + cargoOrCharterNote[lang]}
    />
  );
}
