import { mapRoutes, mapStops } from "../data/routeMap";
import { busTypes, cities, getTerminal, lahore, multan, multanLinks, terminals } from "../data/site";

/** Every city a visitor can pick in the search box (mock mode; live mode loads them from the API). */
export const searchCities = [lahore, ...cities].map((c) => ({ id: c.id, name: c.name }));

export const pkr = (n) => `Rs ${Number(n).toLocaleString("en-US")}`;

export const formatHours = (h, lang) => {
  const whole = Math.floor(h);
  const half = h - whole >= 0.5;
  if (lang === "ur") return half ? `${whole}.5 گھنٹے` : `${whole} گھنٹے`;
  return half ? `${whole}.5 hours` : `${whole} hours`;
};

/** "06:00" -> "6:00 AM", or in Urdu the time of day first: "صبح 6:00". */
export function formatTime(hhmm, lang) {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${h12}:${String(m).padStart(2, "0")}`;
  if (lang === "en") return `${time} ${h >= 12 ? "PM" : "AM"}`;
  const part = h < 4 ? "رات" : h < 12 ? "صبح" : h < 16 ? "دوپہر" : h < 20 ? "شام" : "رات";
  return `${part} ${time}`;
}

/*
 * Route views: one per direction, e.g. Lahore to Multan and Multan to Lahore.
 * { slug, direction: "out" | "back", city, from: { id, name }, to: { id, name }, departures, fares: [{ type, pkr }] }
 */

export const slugFor = (from, to) => `${from}-to-${to}`;

function build(city, direction, hub = lahore) {
  const from = direction === "out" ? hub : city;
  const to = direction === "out" ? city : hub;
  return {
    slug: slugFor(from.id, to.id),
    direction,
    city,
    from: { id: from.id, name: from.name },
    to: { id: to.id, name: to.name },
    departures: direction === "out" ? city.fromLahore : city.toLahore,
    fares: busTypes.flatMap((b) => (city.fares[b.id] ? [{ type: b.id, pkr: city.fares[b.id] }] : [])),
  };
}

export const allRoutes = [
  ...cities.flatMap((c) => [build(c, "out"), build(c, "back")]),
  ...multanLinks.flatMap((c) => [build(c, "out", multan), build(c, "back", multan)]),
];
export const getRoute = (slug) => allRoutes.find((r) => r.slug === slug);

export const lowestFare = (r) => Math.min(...r.fares.map((f) => f.pkr));

export const routeTitle = (r, lang) => (lang === "ur" ? `${r.from.name.ur} سے ${r.to.name.ur}` : `${r.from.name.en} to ${r.to.name.en}`);

/** Terminals a passenger boards at, for this direction. */
export const boardingTerminals = (r) => [getTerminal(r.from.id), getTerminal(r.to.id)];

/** Generated FAQ for a route page. */
export function routeFaq(r, lang) {
  const from = r.from.name[lang];
  const to = r.to.name[lang];
  const lo = lowestFare(r);
  const first = formatTime(r.departures[0], lang);
  const last = formatTime(r.departures[r.departures.length - 1], lang);
  const dur = formatHours(r.city.hours, lang);
  const origin = terminals.find((t) => t.id === r.from.id);
  if (lang === "ur") {
    return [
      {
        q: `${from} سے ${to} کا بس کرایہ کتنا ہے؟`,
        a: `${from} سے ${to} کا کرایہ ${pkr(lo)} فی سیٹ سے شروع ہوتا ہے۔ بس کی قسم کے مطابق کرایہ اوپر دی گئی جدول میں ہے۔ بکنگ سے پہلے واٹس ایپ پر تازہ کرایہ کی تصدیق کر لیں۔`,
      },
      {
        q: `${from} سے ${to} پہنچنے میں کتنا وقت لگتا ہے؟`,
        a: `عام طور پر تقریباً ${dur}، ${r.city.via.ur}۔ ٹریفک اور موسم کے مطابق وقت کم یا زیادہ ہو سکتا ہے۔`,
      },
      {
        q: `${from} سے ${to} کی پہلی اور آخری بس کب ہے؟`,
        a: `روزانہ ${r.departures.length} روانگیاں ہیں، پہلی ${first} اور آخری ${last}۔`,
      },
      {
        q: `${from} میں بس پر کہاں سے سوار ہوں؟`,
        a: origin
          ? `${origin.name.ur}: ${origin.address.ur}۔ روانگی سے کم از کم 30 منٹ پہلے پہنچیں۔`
          : `${from} میں بس صرف سواری چڑھانے اور اتارنے کے اسٹاپ پر رکتی ہے۔ درست جگہ کے لیے ہیلپ لائن پر کال کریں اور روانگی سے کم از کم 30 منٹ پہلے پہنچیں۔`,
      },
      {
        q: `${from} سے ${to} کی سیٹ کیسے بُک کروں؟`,
        a: `سیٹ بُک کریں دبائیں، واٹس ایپ پر تاریخ سمیت پیغام کھل جائے گا۔ یا ہیلپ لائن پر کال کریں۔ ہم آپ کو ٹکٹ نمبر دیں گے۔`,
      },
    ];
  }
  return [
    {
      q: `How much is the bus fare from ${from} to ${to}?`,
      a: `Fares from ${from} to ${to} start from ${pkr(lo)} per seat. The fare for each bus type is in the table above. Please confirm the current fare on WhatsApp before you travel.`,
    },
    {
      q: `How long does the bus take from ${from} to ${to}?`,
      a: `About ${dur} on a normal day, going ${r.city.via.en}. Traffic and weather can change this.`,
    },
    {
      q: `When are the first and last buses from ${from} to ${to}?`,
      a: `There are ${r.departures.length} departures a day. The first leaves at ${first} and the last at ${last}.`,
    },
    {
      q: `Where do I board in ${from}?`,
      a: origin
        ? `${origin.name.en}: ${origin.address.en}. Please arrive at least 30 minutes before departure.`
        : `At ${from} the bus makes a pick-up and drop-off stop only. Call the helpline for the exact spot and be there at least 30 minutes before departure.`,
    },
    {
      q: `How do I book a seat from ${from} to ${to}?`,
      a: `Press Book a seat and WhatsApp opens with your route and date filled in. You can also call the helpline. We give you a ticket number for every seat.`,
    },
  ];
}

/** Short intro paragraph for a route page. */
export function routeIntro(r, lang) {
  const from = r.from.name[lang];
  const to = r.to.name[lang];
  const dur = formatHours(r.city.hours, lang);
  if (lang === "ur") {
    return `نیو خان 1956 سے مسافروں کو لے جا رہا ہے۔ ${from} سے ${to} کی اے سی بس سروس روزانہ ${r.departures.length} روانگیوں کے ساتھ دستیاب ہے۔ سفر تقریباً ${dur} کا ہے (${r.city.distanceKm} کلومیٹر، ${r.city.via.ur})۔`;
  }
  return `New Khan has carried passengers since 1956. Our air-conditioned bus from ${from} to ${to} runs ${r.departures.length} times a day. The trip takes about ${dur} (${r.city.distanceKm} km, ${r.city.via.en}).`;
}

/** Every town some route ends in, for the "Bus to X" pages. */
export const destinationIds = [...new Set(allRoutes.map((r) => r.to.id))];

/** All the routes that end in a town, Lahore first, then by name. */
export const routesTo = (id) =>
  allRoutes
    .filter((r) => r.to.id === id)
    .sort((a, b) => Number(b.from.id === lahore.id) - Number(a.from.id === lahore.id) || a.from.name.en.localeCompare(b.from.name.en));

/**
 * Towns on the same route-map line as a destination that have no fares or times on file yet
 * (shown as "to be confirmed" on the "Bus to X" page).
 */
export function mapOriginsTo(id) {
  const key = Object.keys(mapStops).find((k) => (mapStops[k].cityId ?? lahore.id) === id);
  if (!key) return [];
  const have = new Set(routesTo(id).map((r) => r.from.id));
  const out = new Map();
  for (const r of mapRoutes) {
    if (!r.stops.includes(key)) continue;
    for (const k of r.stops) {
      const oid = mapStops[k].cityId ?? lahore.id;
      if (k !== key && oid !== id && !have.has(oid)) out.set(oid, { id: oid, name: mapStops[k].name });
    }
  }
  return [...out.values()].sort((a, b) => a.name.en.localeCompare(b.name.en));
}

/* Town photos in public/images/towns: <id>.webp (collage), <id>-card.webp (4:3), <id>-wide.webp (21:9). */
const townPhotos = new Set(["bhakkar", "chashma", "di-khan", "esakhel", "mianwali", "multan", "sargodha"]);

/** Photo for a town, or null if there isn't one. "wide" for 21:9 banners, "card" for 4:3 cards. */
export function cityImage(id, variant = "tile") {
  if (!townPhotos.has(id)) return null;
  return variant === "wide" ? `/images/towns/${id}-wide.webp` : variant === "card" ? `/images/towns/${id}-card.webp` : `/images/towns/${id}.webp`;
}
