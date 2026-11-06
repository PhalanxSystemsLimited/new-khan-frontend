/**
 * LIVE booking API (VITE_API_MODE=live): talks to the New Khan backend (backend/ folder, Express + Supabase).
 * Maps the backend's shapes to the ones the booking screens use, so the UI is the same in both modes.
 *
 * The server owns prices, seat locks, the hold timer and payment confirmation. The browser never sends an
 * amount, and a booking only becomes CONFIRMED when the payment gateway's signed webhook says so.
 */
import { cities as siteCities, lahore, multan } from "../../data/site";
import { ApiError } from "../errors";
import { clearSession, getSession, setSession } from "../auth";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

export const MAX_PAX = 6;
/** The backend searches direct trips only, so the "via Lahore" hint never shows in live mode. */
export const hasDirectBus = () => true;

/* ------------------------------------------------------------------ HTTP */

let refreshing = null;
async function refreshToken() {
  const s = getSession();
  if (!s?.refreshToken) return null;
  refreshing ??= fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: s.refreshToken }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error("refresh failed");
      const data = await r.json();
      setSession(data);
      return data.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function validToken() {
  const s = getSession();
  if (!s) return null;
  if (s.expiresAt && s.expiresAt * 1000 - Date.now() < 60_000) return refreshToken();
  return s.accessToken;
}

function toApiError(status, body) {
  const e = body?.error ?? {};
  const detail = e.details?.[0]?.message;
  const message = detail ? `${e.message}: ${detail}` : e.message || "Something went wrong. Please try again.";
  if (status === 401) return new ApiError("AUTH_REQUIRED", message);
  if (status === 404) return new ApiError("NOT_FOUND", message);
  if (status === 409 && e.code === "DUPLICATE") return new ApiError("SEAT_TAKEN", message);
  if (status === 409 && e.code === "SEAT_GENDER") return new ApiError("SEAT_GENDER", message);
  if (status === 400 || status === 422) return new ApiError("INVALID_INPUT", message);
  return new ApiError("INVALID_STATE", message);
}

async function request(path, { method = "GET", body, auth = false, headers = {} } = {}, retried = false) {
  let token = null;
  if (auth) {
    token = await validToken();
    if (!token) throw new ApiError("AUTH_REQUIRED", "Please sign in.");
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("INVALID_STATE", "Could not reach the booking server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && auth && !retried && (await refreshToken())) return request(path, { method, body, auth, headers }, true);
  if (res.status === 401 && auth) clearSession();
  if (!res.ok) throw toApiError(res.status, data);
  return data;
}

/** The same authenticated client, for the admin panel (src/admin). */
export { request as apiRequest };

/* ------------------------------------------------------------------ auth */

export const apiLogin = async (email, password) => setSession(await request("/auth/login", { method: "POST", body: { email, password } }));
export async function apiSignup(fullName, email, password, phone, cnic) {
  const data = await request("/auth/signup", { method: "POST", body: { fullName, email, password, cnic, ...(phone ? { phone } : {}) } });
  if (data.accessToken) setSession(data);
  return { needsConfirmation: !data.accessToken, message: data.message };
}
export const apiOtpSend = (phone) => request("/auth/otp/send", { method: "POST", body: { phone } });
export const apiOtpVerify = async (phone, token) => setSession(await request("/auth/otp/verify", { method: "POST", body: { phone, token } }));
export const apiLogout = (accessToken) =>
  fetch(`${BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });

/* ------------------------------------------------------------------ catalogue */

/** Urdu names for cities the site already knows; anything new shows its English name. */
const known = [lahore, multan, ...siteCities];
const L = (en) => ({ en, ur: known.find((c) => c.name.en.toLowerCase() === String(en).toLowerCase())?.name.ur ?? en });

export async function getCities() {
  const { data } = await request("/cities");
  return data.map((c) => ({ id: String(c.id), name: L(c.name) }));
}

/* Trips found by search are cached for the seats page (it needs the fare and the boarding/dropping stops). */
const TRIP_CACHE = "nk-live-trips";
const cacheGet = (id) => {
  try {
    return JSON.parse(sessionStorage.getItem(TRIP_CACHE) ?? "{}")[id];
  } catch {
    return undefined;
  }
};
const cachePut = (trips) => {
  try {
    const all = JSON.parse(sessionStorage.getItem(TRIP_CACHE) ?? "{}");
    for (const t of trips) all[t.id] = t;
    sessionStorage.setItem(TRIP_CACHE, JSON.stringify(all));
  } catch {
    // ignore
  }
};

/** The UI's trip id carries the backend trip plus the chosen boarding and dropping stops. */
const tripKey = (tripId, b, d) => `${tripId}.${b}.${d}`;
const parseKey = (id) => {
  const [tripId, boardingStopId, droppingStopId] = String(id).split(".").map(Number);
  if (!tripId || !boardingStopId || !droppingStopId) throw new ApiError("NOT_FOUND", "That departure is no longer available.");
  return { tripId, boardingStopId, droppingStopId };
};

export async function searchTrips({ fromId, toId, date }) {
  const q = new URLSearchParams({ fromCityId: fromId, toCityId: toId, date, passengers: "1" });
  const { data } = await request(`/trips/search?${q}`);
  const trips = data.map((r) => ({
    id: tripKey(r.tripId, r.boardingStopId, r.droppingStopId),
    fromId,
    toId,
    fromName: L(r.boardingTerminal),
    toName: L(r.droppingTerminal),
    date,
    departAt: r.boardingAt,
    arriveAt: r.droppingAt,
    busType: "ac",
    fare: r.fare,
    seatsLeft: r.seatsAvailable,
  }));
  cachePut(trips);
  return trips;
}

export const searchItineraries = async (p) =>
  (await searchTrips(p)).map((t) => ({ id: t.id, legs: [t], layoverMin: [], fare: t.fare, seatsLeft: t.seatsLeft }));

export async function getTrip(id) {
  const cached = cacheGet(id);
  if (cached) return cached;
  const { tripId, boardingStopId, droppingStopId } = parseKey(id);
  const { data: t } = await request(`/trips/${tripId}`);
  const b = t.stops.find((s) => s.id === boardingStopId);
  const d = t.stops.find((s) => s.id === droppingStopId);
  if (!b || !d) throw new ApiError("NOT_FOUND", "That departure is no longer available.");
  const { data: fares } = await request(`/fares?routeId=${t.routeId}&busClass=${t.busClass}`);
  const fare = fares.find((f) => f.fromStopId === boardingStopId && f.toStopId === droppingStopId)?.amount ?? 0;
  return { id, fromName: L(b.cityName), toName: L(d.cityName), departAt: b.scheduledAt, arriveAt: d.scheduledAt, busType: "ac", fare };
}

export async function getSeats(id) {
  const { tripId } = parseKey(id);
  const { data } = await request(`/trips/${tripId}/seats`);
  return data.map((s) => ({
    id: String(s.seatId),
    label: s.seatNumber,
    row: s.rowNo,
    col: s.colNo - 1,
    deck: s.deck,
    status: s.status === "available" ? "available" : s.status === "unavailable" ? "blocked" : "booked",
    gender: s.status === "booked" ? (s.occupantGender ?? null) : null, // colours the seat; never who it is
  }));
}

/* ------------------------------------------------------------------ bookings */

const STATUS = { pending: "HELD", confirmed: "CONFIRMED", completed: "CONFIRMED", cancelled: "CANCELLED", refunded: "CANCELLED", expired: "EXPIRED" };

function mapBooking(d) {
  const paid = (d.payments ?? []).find((p) => p.status === "succeeded");
  return {
    ref: d.pnr,
    id: d.id,
    status: STATUS[d.status] ?? "HELD",
    holdExpiresAt: d.holdExpiresAt,
    contactEmail: d.contactEmail ?? "",
    passengers: d.tickets.map((t) => ({ name: t.passengerName })),
    legs: [
      {
        tripId: String(d.tripId),
        trip: {
          fromName: L(d.boardingTerminal),
          toName: L(d.droppingTerminal),
          departAt: d.boardingAt,
          arriveAt: d.droppingAt,
          busType: "ac",
          fare: d.tickets[0]?.fareAmount ?? 0,
          boardingTerminal: d.boardingTerminal,
        },
        seats: d.tickets.map((t) => t.seatNumber),
        fare: d.subtotal,
      },
    ],
    total: d.totalAmount,
    discount: d.discountAmount,
    payment: paid ? { method: paid.method, paidAt: paid.paidAt, txnId: paid.id.slice(0, 8).toUpperCase(), amount: paid.amount } : undefined,
    emails: [],
    canCancel: ["pending", "confirmed"].includes(d.status),
    live: true,
  };
}

/**
 * One backend booking per bus (leg). A return trip makes two bookings; if the second fails the first is
 * cancelled again so no seats stay held by accident. Returns the booking ids for the Reserved screen.
 */
export async function createBooking({ legs, passengers, contactEmail, holderCnic }) {
  const ids = [];
  try {
    for (const leg of legs) {
      const { tripId, boardingStopId, droppingStopId } = parseKey(leg.tripId);
      const { data } = await request("/bookings", {
        method: "POST",
        auth: true,
        body: {
          tripId,
          boardingStopId,
          droppingStopId,
          contact: { name: passengers[0].name, phone: passengers[0].phone, ...(contactEmail ? { email: contactEmail } : {}) },
          ...(holderCnic ? { holderCnic } : {}),
          passengers: passengers.map((p, i) => ({
            seatId: Number(leg.seats[i]),
            name: p.name,
            gender: p.gender,
            ...(p.phone ? { phone: p.phone } : {}),
          })),
        },
      });
      ids.push(data.id);
    }
  } catch (e) {
    await Promise.all(ids.map((id) => request(`/bookings/${id}/cancel`, { method: "POST", auth: true, body: {} }).catch(() => {})));
    throw e;
  }
  return { refs: ids };
}

export async function getBooking(id) {
  const { data } = await request(`/bookings/${encodeURIComponent(id)}`, { auth: true });
  return mapBooking(data);
}

/** Public lookup by PNR + contact phone. Returns a read-only view; managing it needs signing in. */
export async function lookupBooking(pnr, phone) {
  const q = new URLSearchParams({ pnr: pnr.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), phone });
  const { data: d } = await request(`/bookings/lookup?${q}`);
  return {
    ref: d.pnr,
    id: null,
    status: STATUS[d.status] ?? "HELD",
    holdExpiresAt: null,
    contactEmail: "",
    passengers: d.tickets.map((t) => ({ name: t.passengerName })),
    legs: [{ tripId: d.pnr, trip: { fromName: L(d.boardingTerminal), toName: L(d.droppingTerminal), departAt: d.boardingAt, arriveAt: d.boardingAt, busType: "ac", fare: 0, boardingTerminal: d.boardingTerminal }, seats: d.tickets.map((t) => t.seatNumber), fare: d.totalAmount }],
    total: d.totalAmount,
    emails: [],
    canCancel: false,
    readOnly: true,
    paymentReceived: Boolean(d.paymentReceived),
    live: true,
  };
}

/** A booking as a list row (My bookings, mobile-number search). `key` opens it: the backend id, or the PNR. */
const listRow = (d) => ({
  key: d.id ?? d.pnr,
  ref: d.pnr,
  status: STATUS[d.status] ?? "HELD",
  fromName: L(d.boardingTerminal),
  toName: L(d.droppingTerminal),
  departAt: d.boardingAt,
  seats: d.seatNumbers ?? [],
  total: d.totalAmount,
  holdExpiresAt: d.holdExpiresAt ?? null,
  createdAt: d.createdAt,
  paymentReceived: Boolean(d.paymentReceived),
  expirySeen: Boolean(d.expirySeenAt),
  counterSale: Boolean(d.counterSale), // made by this staff account for a walk-in customer
  customerName: d.customerName ?? null,
});

/** Every booking on the signed-in account, newest first (fetched 100 at a time; capped at 1,000). */
export async function listMyBookings() {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    const { data, pagination } = await request(`/bookings/me?limit=100&page=${page}`, { auth: true });
    rows.push(...data);
    if (page >= (pagination?.totalPages ?? 1)) break;
  }
  return rows.map(listRow);
}

/** Records on the account that the "reservation expired" notice was shown for these bookings (keys). */
export async function markExpirySeen(ids) {
  await request("/bookings/expiry-seen", { method: "POST", auth: true, body: { ids } });
}

/** Every booking made with a mobile number (reduced view: no passenger details). */
export async function lookupByPhone(phone) {
  const { data } = await request(`/bookings/lookup-phone?${new URLSearchParams({ phone })}`);
  return data.map(listRow);
}

export async function cancelBooking(id) {
  const { data } = await request(`/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST", auth: true, body: {} });
  return mapBooking(data);
}

export async function resendConfirmation() {
  throw new ApiError("INVALID_STATE", "Confirmations are sent automatically by SMS.");
}

/* ------------------------------------------------------------------ payments */

export const getPaymentMethods = async () => ["jazzcash", "easypaisa", "card"].map((id) => ({ id, available: true }));

/** One idempotency key per booking + method, so a double click or retry never starts two payments. */
function idemKey(id, method) {
  const k = `nk-idem-${id}-${method}`;
  try {
    const have = sessionStorage.getItem(k);
    if (have) return have;
    const v = crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem(k, v);
    return v;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export async function startPayment(id, method, lang) {
  const { data } = await request("/payments/intent", {
    method: "POST",
    auth: true,
    headers: { "Idempotency-Key": idemKey(id, method) },
    body: { bookingId: id, method, ...(lang === "ur" || lang === "en" ? { lang } : {}) },
  });
  const c = data.checkout ?? {};
  if (c.redirectUrl) return { kind: "redirect", url: c.redirectUrl };
  if (c.formUrl && c.fields) return { kind: "form", url: c.formUrl, fields: c.fields };
  throw new ApiError("PAYMENT_UNAVAILABLE", c.instructions ?? "Online payment is not available yet.");
}

export async function completeMockPayment() {
  throw new ApiError("INVALID_STATE", "The simulated gateway only exists in demo mode.");
}
