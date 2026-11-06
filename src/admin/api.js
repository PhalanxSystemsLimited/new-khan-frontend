/**
 * Admin panel data access: thin wrappers over the backend's staff/admin endpoints (see backend/README.md §9).
 * Every call is authenticated with the signed-in user's token; the backend checks the role on every request.
 */
import { apiRequest } from "../booking/live/liveApi";

const get = (path) => apiRequest(path, { auth: true });
const send = (method, path, body) => apiRequest(path, { method, auth: true, body: body ?? {} });

/** Drops empty values from a query object and builds "?a=1&b=2". */
export const qs = (o = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const adminApi = {
  me: () => get("/users/me").then((r) => r.data),

  // operations
  trips: (date, status) => get(`/trips${qs({ date, status })}`).then((r) => r.data),
  createTrip: (b) => send("POST", "/trips", b).then((r) => r.data),
  tripStatus: (id, b) => send("PATCH", `/trips/${id}/status`, b),
  tripAssign: (id, b) => send("PATCH", `/trips/${id}/assignment`, b).then((r) => r.data),
  manifest: (id) => get(`/trips/${id}/manifest`).then((r) => r.data),
  board: (ticketId) => send("POST", `/tickets/${ticketId}/board`),
  bookings: (q) => get(`/bookings${qs(q)}`),
  booking: (id) => get(`/bookings/${id}`).then((r) => r.data),
  cancelQuote: (id) => get(`/bookings/${id}/cancel-quote`).then((r) => r.data),
  cancelBooking: (id, reason) => send("POST", `/bookings/${id}/cancel`, reason ? { reason } : {}),
  counterQuote: (id) => get(`/bookings/${id}/counter-quote`).then((r) => r.data),
  counterCode: (id) => send("POST", `/bookings/${id}/counter-code`).then((r) => r.data),
  counterCancel: (id, b) => send("POST", `/bookings/${id}/counter-cancel`, b),
  cashPayment: (bookingId, amount) => send("POST", "/payments/cash", { bookingId, amount }).then((r) => r.data),
  refunds: (q) => get(`/admin/refunds${qs(q)}`),
  updateRefund: (id, b) => send("PATCH", `/admin/refunds/${id}`, b).then((r) => r.data),

  // setup
  routes: () => get("/admin/routes").then((r) => r.data),
  route: (id) => get(`/admin/routes/${id}`).then((r) => r.data),
  createRoute: (b) => send("POST", "/routes", b).then((r) => r.data),
  updateRoute: (id, b) => send("PATCH", `/routes/${id}`, b).then((r) => r.data),
  replaceStops: (id, stops) => send("PUT", `/routes/${id}/stops`, { stops }).then((r) => r.data),
  fares: (routeId) => get(`/fares${qs({ routeId })}`).then((r) => r.data),
  createFare: (b) => send("POST", "/fares", b).then((r) => r.data),
  updateFare: (id, b) => send("PATCH", `/fares/${id}`, b).then((r) => r.data),
  schedules: () => get("/schedules").then((r) => r.data),
  createSchedule: (b) => send("POST", "/schedules", b).then((r) => r.data),
  updateSchedule: (id, b) => send("PATCH", `/schedules/${id}`, b).then((r) => r.data),
  generateTrips: (id, b) => send("POST", `/schedules/${id}/generate-trips`, b),
  layouts: () => get("/fleet/layouts").then((r) => r.data),
  buses: () => get("/fleet/buses").then((r) => r.data),
  createBus: (b) => send("POST", "/fleet/buses", b).then((r) => r.data),
  updateBus: (id, b) => send("PATCH", `/fleet/buses/${id}`, b).then((r) => r.data),
  drivers: () => get("/fleet/drivers").then((r) => r.data),
  createDriver: (b) => send("POST", "/fleet/drivers", b).then((r) => r.data),
  updateDriver: (id, b) => send("PATCH", `/fleet/drivers/${id}`, b).then((r) => r.data),
  locations: () => get("/admin/locations").then((r) => r.data),
  createCity: (b) => send("POST", "/cities", b).then((r) => r.data),
  updateCity: (id, b) => send("PATCH", `/cities/${id}`, b).then((r) => r.data),
  createTerminal: (b) => send("POST", "/terminals", b).then((r) => r.data),
  updateTerminal: (id, b) => send("PATCH", `/terminals/${id}`, b).then((r) => r.data),
  promos: (q) => get(`/admin/promo-codes${qs(q)}`),
  createPromo: (b) => send("POST", "/admin/promo-codes", b).then((r) => r.data),
  updatePromo: (id, b) => send("PATCH", `/admin/promo-codes/${id}`, b).then((r) => r.data),
  policies: () => get("/admin/cancellation-policies").then((r) => r.data),
  savePolicies: (policies) => send("PUT", "/admin/cancellation-policies", { policies }).then((r) => r.data),

  // people and reports
  users: (q) => get(`/users${qs(q)}`),
  setRole: (id, role) => send("PATCH", `/users/${id}/role`, { role }).then((r) => r.data),
  setActive: (id, isActive) => send("PATCH", `/users/${id}/status`, { isActive }).then((r) => r.data),
  summary: (from, to) => get(`/admin/reports/summary${qs({ from, to })}`).then((r) => r.data),
  cashReport: (from, to) => get(`/admin/reports/cash${qs({ from, to })}`).then((r) => r.data),
  dailyRevenue: (from, to) => get(`/admin/reports/daily-revenue${qs({ from, to })}`).then((r) => r.data),
  auditLogs: (q) => get(`/admin/audit-logs${qs(q)}`),

  // website content
  content: () => get("/admin/content").then((r) => r.data),
  saveContent: (key, value) => send("PUT", `/admin/content/${key}`, { value }).then((r) => r.data),
  resetContent: (key) => send("DELETE", `/admin/content/${key}`),
};
