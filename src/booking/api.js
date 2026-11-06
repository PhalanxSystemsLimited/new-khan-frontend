/**
 * Booking API client: the ONLY module the booking screens use for data.
 * VITE_API_MODE=mock (default): everything runs in the browser with placeholder trips (mock/mockApi.js).
 * VITE_API_MODE=live: the New Khan backend (live/liveApi.js).
 */
import * as mock from "./mock/mockApi";
import * as live from "./live/liveApi";

export const IS_LIVE = import.meta.env.VITE_API_MODE === "live";
const impl = IS_LIVE ? live : mock;

export const MAX_PAX = impl.MAX_PAX;
export const hasDirectBus = (a, b) => impl.hasDirectBus(a, b);
export const getCities = () => impl.getCities();
export const searchTrips = (p) => impl.searchTrips(p);
export const searchItineraries = (p) => impl.searchItineraries(p);
export const getTrip = (id) => impl.getTrip(id);
export const getSeats = (id) => impl.getSeats(id);
/** Reserves seats and starts the payment hold. Resolves to { refs: [...] }. Rejects with SEAT_TAKEN or AUTH_REQUIRED. */
export const createBooking = (input) => impl.createBooking(input);
export const getBooking = (ref) => impl.getBooking(ref);
export const lookupBooking = (ref, phone) => impl.lookupBooking(ref, phone);
export const cancelBooking = (ref) => impl.cancelBooking(ref);
/** Bookings of the signed-in customer (live) or of this browser (demo), newest first, as list rows. */
export const listMyBookings = () => impl.listMyBookings();
/** Remembers (on the account, live) that the "reservation expired" notice was shown for these list keys. */
export const markExpirySeen = (keys) => impl.markExpirySeen(keys);
/** Every booking made with a mobile number, as list rows without passenger details. */
export const lookupByPhone = (phone) => impl.lookupByPhone(phone);
export const resendConfirmation = (ref) => impl.resendConfirmation(ref);
export const getPaymentMethods = () => impl.getPaymentMethods();
/** Asks for a payment session. The amount is never sent: the server reads it from the booking. */
export const startPayment = (ref, method, lang) => impl.startPayment(ref, method, lang);
export const completeMockPayment = (orderId, outcome) => impl.completeMockPayment(orderId, outcome);

/** Sends the browser to the gateway: auto-submits a POST form, or follows a redirect. */
export function goToGateway(s) {
  if (s.kind === "redirect") {
    window.location.assign(s.url);
    return;
  }
  const f = document.createElement("form");
  f.method = "POST";
  f.action = s.url;
  for (const [k, v] of Object.entries(s.fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}
