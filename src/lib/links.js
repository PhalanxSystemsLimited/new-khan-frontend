import { company } from "../data/site";

/** "Onward" arrow for the reading direction: → in English, ← in Urdu (right to left). */
export const arrow = (lang) => (lang === "ur" ? "←" : "→");

/** App path for a language: href("ur", "/book") -> "/ur/book". */
export const href = (lang, path = "") => `/${lang}${path === "/" ? "" : path}`;

/** Prefilled WhatsApp link: route, date and seats already typed for the customer. */
export function whatsappLink(lang, info = {}) {
  const ur = lang === "ur";
  const lines = [ur ? "السلام علیکم، میں نیو خان میں سیٹ بُک کرنا چاہتا/چاہتی ہوں۔" : "Assalam o Alaikum, I would like to book a seat with New Khan."];
  if (info.from && info.to) lines.push(ur ? `روٹ: ${info.from} سے ${info.to}` : `Route: ${info.from} → ${info.to}`);
  if (info.date) lines.push(`${ur ? "تاریخ" : "Date"}: ${info.date}`);
  if (info.seats) lines.push(`${ur ? "سیٹیں" : "Seats"}: ${info.seats}`);
  lines.push(ur ? "براہِ کرم دستیابی اور کرایہ بتائیں۔" : "Please confirm availability and fare.");
  return `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export const telLink = `tel:${company.helplineTel}`;

export const mailLink = `mailto:${company.email}`;

/** Google Maps link for a terminal: its own map URL if it has one, otherwise a search. */
export const mapsLink = (query, url) => url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/** Breadcrumb separator, pointing the way the trail reads. */
export const crumb = (lang) => (lang === "ur" ? "‹" : "›");
