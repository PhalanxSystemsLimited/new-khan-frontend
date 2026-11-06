/**
 * MOCK timetable, fares and seat-map rules (VITE_API_MODE=mock). Pure functions, ported from the live site.
 * Every fare, time and seed here is a PLACEHOLDER from src/data/site.js.
 */
import { cities, lahore, multan, multanLinks } from "../../data/site";
import { ApiError } from "../errors";
import { addDaysPKT, isoFor, toPktIso, todayPKT } from "../time";

export const HOLD_HOURS = 3;
export const MAX_PAX = 6;
export const MAX_LEGS = 4;
export const MIN_LAYOVER_MIN = 60;
export const MAX_LAYOVER_MIN = 14 * 60;
const SEAT_ROWS = 10;
const SEAT_LETTERS = ["A", "B", "C", "D"]; // A B | aisle | C D

/** State machine. HELD -> CONFIRMED | EXPIRED | CANCELLED. CONFIRMED -> CANCELLED. Nothing else. */
const ALLOWED = { HELD: ["CONFIRMED", "EXPIRED", "CANCELLED"], CONFIRMED: ["CANCELLED"], EXPIRED: [], CANCELLED: [] };
export const canTransition = (from, to) => ALLOWED[from].includes(to);

export const allSeatIds = () => Array.from({ length: SEAT_ROWS }, (_, r) => SEAT_LETTERS.map((l) => `${r + 1}${l}`)).flat();

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Seats already sold before the customer arrived (deterministic per trip). PLACEHOLDER. */
export function seededBooked(tripId) {
  const rand = rng(hash(tripId));
  const ratio = 0.3 + rand() * 0.45;
  return new Set(allSeatIds().filter(() => rand() < ratio));
}

const cityFor = (a, b) => {
  if (a === lahore.id) {
    const c = cities.find((x) => x.id === b);
    return c ? { city: c, outbound: true } : null;
  }
  if (b === lahore.id) {
    const c = cities.find((x) => x.id === a);
    return c ? { city: c, outbound: false } : null;
  }
  // Route 4 runs from Multan and does not pass through Lahore
  if (a === multan.id) {
    const c = multanLinks.find((x) => x.id === b);
    return c ? { city: c, outbound: true } : null;
  }
  if (b === multan.id) {
    const c = multanLinks.find((x) => x.id === a);
    return c ? { city: c, outbound: false } : null;
  }
  return null;
};

/** True when one New Khan bus runs between the two places. */
export const hasDirectBus = (a, b) => cityFor(a, b) !== null;

const nameOf = (id) =>
  id === lahore.id ? lahore.name : id === multan.id ? multan.name : (cities.find((c) => c.id === id) ?? multanLinks.find((c) => c.id === id)).name;

/** Gender of the made-up passenger in a seeded sold seat (deterministic per trip and seat). PLACEHOLDER. */
const seededGender = (tripId, seat) => (rng(hash(`${tripId}:${seat}`))() < 0.5 ? "female" : "male");

/** Seat statuses = seeded sold seats + every held / confirmed seat on this trip, with each occupant's gender. */
export function seatMap(tripId, occ) {
  const sold = seededBooked(tripId);
  const { held, confirmed, genders } = occ(tripId);
  for (const s of confirmed) sold.add(s);
  return allSeatIds().map((id) => {
    const row = Number(id.slice(0, -1));
    const col = SEAT_LETTERS.indexOf(id.slice(-1));
    const status = sold.has(id) ? "booked" : held.has(id) ? "held" : "available";
    const gender = status === "available" ? null : (genders.get(id) ?? seededGender(tripId, id));
    return { id, label: id, row, col, status, gender };
  });
}

export function tripsFor(fromId, toId, date, occ) {
  const hit = cityFor(fromId, toId);
  if (!hit) return [];
  const { city, outbound } = hit;
  const times = outbound ? city.fromLahore : city.toLahore;
  const types = Object.keys(city.fares).filter((t) => city.fares[t]);
  const now = Date.now();
  return times
    .map((hhmm, i) => {
      const busType = types[i % types.length];
      const departAt = isoFor(date, hhmm);
      return {
        id: `${fromId}~${toId}~${date}~${hhmm.replace(":", "")}`,
        fromId,
        toId,
        fromName: nameOf(fromId),
        toName: nameOf(toId),
        date,
        departAt,
        arriveAt: toPktIso(Date.parse(departAt) + city.hours * 3600_000),
        busType,
        fare: city.fares[busType],
        seatsTotal: allSeatIds().length,
        seatsLeft: 0,
      };
    })
    .filter((t) => Date.parse(t.departAt) > now) // hide buses that already left
    .map((t) => ({ ...t, seatsLeft: seatMap(t.id, occ).filter((s) => s.status === "available").length }));
}

export function checkSearch(p) {
  if (p.fromId === p.toId) throw new ApiError("INVALID_INPUT", "From and To must differ.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || p.date < todayPKT()) throw new ApiError("INVALID_INPUT", "Pick today or a later date.");
}

const single = (t) => ({ id: t.id, legs: [t], layoverMin: [], fare: t.fare, seatsLeft: t.seatsLeft });

/**
 * Journeys between two cities: direct buses, or (when neither end is Lahore) two buses joined by a layover
 * in Lahore of 60 minutes to 14 hours.
 */
export function itinerariesFor(p, occ) {
  if (p.fromId === lahore.id || p.toId === lahore.id) return tripsFor(p.fromId, p.toId, p.date, occ).map(single);
  const direct = tripsFor(p.fromId, p.toId, p.date, occ);
  if (direct.length) return direct.map(single);

  const firsts = tripsFor(p.fromId, lahore.id, p.date, occ);
  const seconds = [...tripsFor(lahore.id, p.toId, p.date, occ), ...tripsFor(lahore.id, p.toId, addDaysPKT(p.date, 1), occ)];
  const out = [];
  for (const a of firsts) {
    const arrive = Date.parse(a.arriveAt);
    const fits = seconds
      .map((b) => ({ b, wait: Math.round((Date.parse(b.departAt) - arrive) / 60000) }))
      .filter((x) => x.wait >= MIN_LAYOVER_MIN && x.wait <= MAX_LAYOVER_MIN)
      .sort((x, y) => x.wait - y.wait)
      .slice(0, 2);
    for (const { b, wait } of fits) {
      out.push({ id: `${a.id}|${b.id}`, legs: [a, b], layoverMin: [wait], fare: a.fare + b.fare, seatsLeft: Math.min(a.seatsLeft, b.seatsLeft) });
    }
  }
  return out.sort((x, y) => Date.parse(x.legs[0].departAt) - Date.parse(y.legs[0].departAt));
}

export function tripById(tripId, occ) {
  const [fromId, toId, date] = tripId.split("~");
  const t = fromId && toId && date ? tripsFor(fromId, toId, date, occ).find((x) => x.id === tripId) : undefined;
  if (!t) throw new ApiError("NOT_FOUND", "That departure is no longer available.");
  return t;
}
