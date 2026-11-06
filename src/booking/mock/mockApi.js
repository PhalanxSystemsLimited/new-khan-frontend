/**
 * MOCK booking API (VITE_API_MODE=mock): the whole flow runs in the browser, on the same rules as the live
 * site's preview build: seat locks, 3-hour hold, state machine and a simulated payment. Bookings live in this
 * browser's localStorage only. Nothing is charged and no real ticket is issued.
 */
import { ApiError } from "../errors";
import { allowedGenders } from "../seatRules";
import { toPktIso } from "../time";
import { allSeatIds, canTransition, checkSearch, HOLD_HOURS, itinerariesFor, MAX_LEGS, MAX_PAX, seatMap, seededBooked, tripById, tripsFor } from "./trips";

export { hasDirectBus, MAX_PAX } from "./trips";

const KEY = "nk-demo-bookings";
const ORDERS = "nk-demo-orders";

const read = (k, empty) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : empty;
  } catch {
    return empty;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // Private mode or storage switched off: the booking still works for this page view.
  }
};

const all = () => read(KEY, {});
const save = (b) => write(KEY, { ...all(), [b.ref]: b });

/** HELD bookings past their hold become EXPIRED (and free their seats). */
function sweep(now = Date.now()) {
  const list = all();
  let changed = false;
  for (const b of Object.values(list)) {
    if (b.status === "HELD" && Date.parse(b.holdExpiresAt) <= now) {
      b.status = "EXPIRED";
      b.expiredAt = toPktIso(now);
      changed = true;
    }
  }
  if (changed) write(KEY, list);
  return list;
}

/** Seats held or sold on a trip by bookings made in this browser, and the gender of each seat's passenger. */
const occupancy = (tripId) => {
  const held = new Set();
  const confirmed = new Set();
  const genders = new Map();
  for (const b of Object.values(sweep())) {
    if (b.status !== "HELD" && b.status !== "CONFIRMED") continue;
    for (const l of b.legs) {
      if (l.tripId !== tripId) continue;
      l.seats.forEach((s, i) => {
        (b.status === "HELD" ? held : confirmed).add(s);
        if (b.passengers[i]?.gender) genders.set(s, b.passengers[i].gender);
      });
    }
  }
  return { held, confirmed, genders };
};

const move = (b, to) => {
  if (!canTransition(b.status, to)) throw new ApiError("INVALID_STATE", `This booking is ${b.status.toLowerCase()} and cannot be changed.`);
  b.status = to;
};

const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeRef = () => "NK-" + Array.from({ length: 6 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join("");
const PK_MOBILE = /^(?:\+?92|0)3\d{9}$/;

export const searchTrips = async (p) => {
  checkSearch(p);
  return tripsFor(p.fromId, p.toId, p.date, occupancy);
};
export const searchItineraries = async (p) => {
  checkSearch(p);
  return itinerariesFor(p, occupancy);
};
export const getTrip = async (tripId) => tripById(tripId, occupancy);
export const getSeats = async (tripId) => seatMap(tripId, occupancy);

export async function createBooking({ legs, passengers, contactEmail, holderCnic }) {
  if (!/^\d{13}$/.test(String(holderCnic ?? "").replace(/\D/g, ""))) throw new ApiError("INVALID_INPUT", "Enter the booking holder's CNIC (13 digits).");
  if (!Array.isArray(legs) || legs.length < 1 || legs.length > MAX_LEGS) throw new ApiError("INVALID_INPUT", `A booking has 1 to ${MAX_LEGS} legs.`);
  if (!Array.isArray(passengers) || passengers.length < 1 || passengers.length > MAX_PAX) throw new ApiError("INVALID_INPUT", `1 to ${MAX_PAX} passengers.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail ?? "")) throw new ApiError("INVALID_INPUT", "Enter a valid email.");
  const pax = passengers.map((p) => ({
    name: String(p?.name ?? "").trim().slice(0, 100),
    phone: String(p?.phone ?? "").replace(/[\s-]/g, ""),
    gender: p?.gender,
  }));
  for (const p of pax) {
    if (p.name.length < 2) throw new ApiError("INVALID_INPUT", "Enter each passenger's name.");
    if (!PK_MOBILE.test(p.phone)) throw new ApiError("INVALID_INPUT", "Enter a valid Pakistani mobile number.");
    if (p.gender !== "male" && p.gender !== "female") throw new ApiError("INVALID_INPUT", "Each passenger must be male or female.");
  }
  const valid = new Set(allSeatIds());
  const list = sweep();
  let ref = makeRef();
  while (list[ref]) ref = makeRef();

  const outLegs = [];
  for (const l of legs) {
    if (!Array.isArray(l.seats) || new Set(l.seats).size !== pax.length || l.seats.some((s) => !valid.has(s))) throw new ApiError("INVALID_INPUT", "Pick one seat per passenger.");
    const trip = tripById(String(l.tripId), occupancy);
    const sold = seededBooked(trip.id);
    const { held, confirmed } = occupancy(trip.id);
    for (const s of l.seats) {
      if (sold.has(s) || held.has(s) || confirmed.has(s)) throw new ApiError("SEAT_TAKEN", `Seat ${s} on ${trip.fromName.en} to ${trip.toName.en} was just taken.`);
    }
    // Side-by-side rule, as the server checks it: no male beside a female from another booking, either way.
    const seats = seatMap(trip.id, occupancy);
    l.seats.forEach((s, i) => {
      const seat = seats.find((x) => x.id === s);
      if (!allowedGenders(seat, seats).includes(pax[i].gender)) {
        throw new ApiError("SEAT_GENDER", `Seat ${s} is next to a passenger of the other gender from another booking.`);
      }
    });
    outLegs.push({ group: l.group === 1 ? 1 : 0, tripId: trip.id, trip, seats: l.seats, fare: trip.fare * pax.length });
  }
  const now = Date.now();
  const booking = {
    ref,
    status: "HELD",
    createdAt: toPktIso(now),
    holdExpiresAt: toPktIso(now + HOLD_HOURS * 3600_000),
    contactEmail,
    passengers: pax,
    legs: outLegs,
    total: outLegs.reduce((a, l) => a + l.fare, 0),
    emails: [],
    canCancel: true,
  };
  save(booking);
  return { refs: [booking.ref] };
}

export async function getBooking(ref) {
  const b = sweep()[String(ref).trim().toUpperCase()];
  if (!b) throw new ApiError("NOT_FOUND", "We could not find that booking. Bookings in demo mode are kept in the browser they were made in.");
  return { ...b, canCancel: true };
}

const digits = (s) => s.replace(/\D/g, "").replace(/^92/, "0");

export async function lookupBooking(ref, phone) {
  const b = sweep()[String(ref).trim().toUpperCase()];
  if (!b || !b.passengers.some((p) => digits(p.phone) === digits(String(phone)))) {
    throw new ApiError("NOT_FOUND", "No booking matches that reference and phone number in this browser.");
  }
  return { ...b, canCancel: true };
}

const mockRow = (b) => ({
  key: b.ref,
  ref: b.ref,
  status: b.status,
  fromName: b.legs[0].trip.fromName,
  toName: b.legs[b.legs.length - 1].trip.toName,
  departAt: b.legs[0].trip.departAt,
  seats: b.legs[0].seats,
  total: b.total,
  holdExpiresAt: b.holdExpiresAt,
  createdAt: b.createdAt,
  paymentReceived: false,
  expirySeen: Boolean(b.expirySeen),
});
const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));

/** Demo mode keeps bookings in this browser, so "my bookings" is every booking made here. */
export async function listMyBookings() {
  return Object.values(sweep()).sort(newestFirst).map(mockRow);
}

/** Demo: the "reservation expired" notice was shown for these bookings (refs). */
export async function markExpirySeen(refs) {
  const list = all();
  for (const r of refs) if (list[r]) list[r].expirySeen = true;
  write(KEY, list);
}

export async function lookupByPhone(phone) {
  return Object.values(sweep())
    .filter((b) => b.passengers.some((p) => digits(p.phone) === digits(String(phone))))
    .sort(newestFirst)
    .map(mockRow);
}

export async function cancelBooking(ref) {
  const b = await getBooking(ref);
  move(b, "CANCELLED");
  b.cancelledAt = toPktIso(Date.now());
  save(b);
  return b;
}

export async function resendConfirmation(ref) {
  const b = await getBooking(ref);
  if (b.status !== "CONFIRMED") throw new ApiError("INVALID_STATE", "Only confirmed bookings have a confirmation email.");
  b.emails.push({ kind: "confirmation", sentAt: toPktIso(Date.now()) });
  save(b);
  return b;
}

export const getPaymentMethods = async () => ["jazzcash", "easypaisa", "card"].map((id) => ({ id, available: true }));

export async function startPayment(ref, method) {
  const b = await getBooking(ref);
  if (b.status !== "HELD") throw new ApiError(b.status === "EXPIRED" ? "EXPIRED" : "INVALID_STATE", "This booking can no longer be paid.");
  const orderId = `${b.ref}-${Date.now().toString(36)}`;
  write(ORDERS, { ...read(ORDERS, {}), [orderId]: { ref: b.ref, method } });
  return { kind: "mock", orderId };
}

export async function completeMockPayment(orderId, outcome) {
  const order = read(ORDERS, {})[orderId];
  if (!order) throw new ApiError("NOT_FOUND", "Payment not found.");
  const b = await getBooking(order.ref);
  if (outcome === "failure") throw new ApiError("PAYMENT_FAILED", "The payment did not go through. Nothing was charged.");
  if (b.status === "EXPIRED") throw new ApiError("EXPIRED", "The hold on this booking ran out before payment.");
  move(b, "CONFIRMED");
  b.payment = { method: order.method, paidAt: toPktIso(Date.now()), txnId: `DEMO-${orderId.slice(-8).toUpperCase()}`, amount: b.total };
  b.emails.push({ kind: "confirmation", sentAt: toPktIso(Date.now()) });
  save(b);
  return { ok: true, ref: b.ref };
}

/** Mock mode has the site's own city list. */
export const getCities = async () => null;
