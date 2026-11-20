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
  /** The one-off form: { data: trip, returnTrip, warnings } (returnTrip when b.returnTrip was sent). */
  createOneOffTrip: (b) => send("POST", "/trips", b),
  tripStatus: (id, b) => send("PATCH", `/trips/${id}/status`, b),
  /** { data: trip, warnings }. Saving with a bus confirms it. */
  tripAssign: (id, b) => send("PATCH", `/trips/${id}/assignment`, b),
  /** Active buses with the trip's seat layout, each with busyTripId (the confirmed trip it is on then) or null. */
  busOptions: (id) => get(`/trips/${id}/bus-options`).then((r) => r.data),
  /** { routes, busTypes, buses, plannedAllowed } for "Add extra departure". */
  extraOptions: (terminalId) => get(`/trips/extra-options${qs({ terminalId })}`).then((r) => r.data),
  /** { data: trip, planned }. Throws code NEAR_DEPARTURE when another departure is close: send again with allowNear. */
  createExtra: (b) => send("POST", "/trips/extra", b),
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

  // extra load slips (LD-…): a passenger's extra luggage, tied to their booking
  /** { bookingId, pnr, status, routeName, busNo, boardingAt, boardingCity, droppingCity, passengers, slips, canAdd, whyNot } */
  findLoadBooking: (q) => get(`/load-slips/find${qs({ q })}`).then((r) => r.data),
  addLoadSlip: (b) => send("POST", "/load-slips", b).then((r) => r.data),
  loadSlip: (id) => get(`/load-slips/${id}`).then((r) => r.data),
  cancelLoadSlip: (id, reason) => send("POST", `/load-slips/${id}/cancel`, { reason }).then((r) => r.data),
  /** The conductor, on the bus: a slip on a passenger's booking (the cash stays with him). */
  conductorAddLoad: (ticketId, b) => send("POST", `/conductor/tickets/${ticketId}/load-slips`, b).then((r) => r.data),

  // cargo (parcels)
  cargoSetup: () => get("/cargo/setup").then((r) => r.data),
  cargoSaveSettings: (b) => send("PUT", "/cargo/settings", b).then((r) => r.data),
  cargoCreateRate: (b) => send("POST", "/cargo/rates", b).then((r) => r.data),
  cargoUpdateRate: (id, b) => send("PATCH", `/cargo/rates/${id}`, b).then((r) => r.data),
  cargoParcels: (q) => get(`/cargo/parcels${qs(q)}`),
  cargoParcel: (id) => get(`/cargo/parcels/${id}`).then((r) => r.data),
  cargoBook: (b) => send("POST", "/cargo/parcels", b).then((r) => r.data),
  /** { data: parcel, refundCash } */
  cargoCancel: (id, reason) => send("POST", `/cargo/parcels/${id}/cancel`, { reason }),
  cargoSlip: (id) => get(`/cargo/parcels/${id}/slip`).then((r) => r.data),
  cargoLoading: (tripId, stopId) => get(`/cargo/loading/${tripId}/${stopId}`).then((r) => r.data),
  /** { data: the loading screen, added: "CG-…" } */
  cargoListAdd: (tripId, stopId, parcel) => send("POST", `/cargo/loading/${tripId}/${stopId}`, { parcel }),
  cargoListRemove: (tripId, stopId, parcelId) => send("DELETE", `/cargo/loading/${tripId}/${stopId}/parcels/${parcelId}`).then((r) => r.data),
  cargoLists: (q) => get(`/cargo/lists${qs(q)}`),
  cargoList: (id) => get(`/cargo/lists/${id}`).then((r) => r.data),
  cargoArrivals: (terminalId) => get(`/cargo/arrivals${qs({ terminalId })}`).then((r) => r.data),
  /** { data: the arrivals screen, received: ["CG-…"] } */
  cargoReceive: (b) => send("POST", "/cargo/arrivals/receive", b),
  /** { data: parcel, cashTaken } */
  cargoDeliver: (id, b) => send("POST", `/cargo/parcels/${id}/deliver`, b),
  cargoReturn: (id, reason) => send("POST", `/cargo/parcels/${id}/return`, { reason }).then((r) => r.data),

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
  // home screens
  counterDepartures: (date, terminalId) => get(`/counter/departures${qs({ date, terminalId })}`).then((r) => r.data),
  tripSeats: (tripId) => get(`/trips/${tripId}/seats`).then((r) => r.data),
  createCounterBooking: (b) => send("POST", "/bookings", b).then((r) => r.data),
  myTrips: () => get("/me/trips").then((r) => r.data),
  board: (date) => get(`/board${qs({ date })}`).then((r) => r.data),

  // day plan
  dayPlan: (from, to) => get(`/admin/day-plan${qs({ from, to })}`).then((r) => r.data),
  publishDayPlan: (from, to) => send("POST", "/admin/day-plan/publish", { from, to }).then((r) => r.data),

  // employees (IT/HR)
  employees: (q) => get(`/admin/employees${qs(q)}`),
  employee: (id) => get(`/admin/employees/${id}`).then((r) => r.data),
  nextEmployeeCode: () => get("/admin/employees/next-code").then((r) => r.data.code),
  employeeLists: () => get("/admin/employees/lists").then((r) => r.data),
  addEmployeeListItem: (list, name) => send("POST", `/admin/employees/lists/${list}`, { name }).then((r) => r.data),
  updateEmployeeListItem: (list, id, b) => send("PATCH", `/admin/employees/lists/${list}/${id}`, b).then((r) => r.data),
  createEmployee: (b) => send("POST", "/admin/employees", b).then((r) => r.data),
  updateEmployee: (id, b) => send("PATCH", `/admin/employees/${id}`, b).then((r) => r.data),
  linkEmployeeLogin: (id, b) => send("PATCH", `/admin/employees/${id}/login`, b).then((r) => r.data),
  /** Hostesses / Cashiers pages: employees whose designation feeds that dropdown. status: active | left | all. */
  employeeTeam: (kind, status = "active") => get(`/admin/employees/team${qs({ kind, status })}`).then((r) => r.data),
  /** Active people of one crew kind for dropdowns: driver, conductor, hostess, cashier. */
  crew: (kind) => get(`/employees/crew${qs({ kind })}`).then((r) => r.data),
  conductors: () => get("/fleet/conductors").then((r) => r.data),
  createConductor: (b) => send("POST", "/fleet/conductors", b).then((r) => r.data),
  updateConductor: (id, b) => send("PATCH", `/fleet/conductors/${id}`, b).then((r) => r.data),
  staffDirectory: () => get("/fleet/staff-directory").then((r) => r.data),
  createStaffMember: (b) => send("POST", "/fleet/staff-directory", b).then((r) => r.data),
  updateStaffMember: (id, b) => send("PATCH", `/fleet/staff-directory/${id}`, b).then((r) => r.data),
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
  /** b: { role, terminalId? } (counter staff need a terminal). */
  setRole: (id, b) => send("PATCH", `/users/${id}/role`, b).then((r) => r.data),
  staffAccounts: () => get("/users/staff").then((r) => r.data),
  setActive: (id, isActive) => send("PATCH", `/users/${id}/status`, { isActive }).then((r) => r.data),
  summary: (from, to) => get(`/admin/reports/summary${qs({ from, to })}`).then((r) => r.data),
  cashReport: (from, to) => get(`/admin/reports/cash${qs({ from, to })}`).then((r) => r.data),
  dailyRevenue: (from, to) => get(`/admin/reports/daily-revenue${qs({ from, to })}`).then((r) => r.data),
  auditLogs: (q) => get(`/admin/audit-logs${qs(q)}`),
  auditLogMeta: () => get("/admin/audit-logs/meta").then((r) => r.data),
  auditLog: (id) => get(`/admin/audit-logs/${encodeURIComponent(id)}`).then((r) => r.data),

  // live trip vouchers (from paid seats)
  tripVouchers: (q) => get(`/trip-vouchers${qs(q)}`),
  tripVoucher: (id) => get(`/trip-vouchers/${id}`).then((r) => r.data),
  issuedVouchers: (q) => get(`/trip-vouchers/issued${qs(q)}`),
  voucherByNumber: (no) => get(`/trip-vouchers/by-number/${encodeURIComponent(no)}`).then((r) => r.data),
  issuedVoucher: (voucherId) => get(`/trip-vouchers/voucher/${voucherId}`).then((r) => r.data),
  generateVoucher: (tripId, b) => send("POST", `/trip-vouchers/${tripId}/generate`, b).then((r) => r.data),
  replaceVoucher: (voucherId, reason) => send("POST", `/trip-vouchers/voucher/${voucherId}/replace`, { reason }).then((r) => r.data),

  // conductor screen
  conductorVoucher: (no) => get(`/conductor/voucher/${encodeURIComponent(no)}`).then((r) => r.data),
  conductorAddPassenger: (tripId, b) => send("POST", `/conductor/trips/${tripId}/passengers`, b).then((r) => r.data),
  conductorNoShow: (ticketId, note) => send("POST", `/conductor/tickets/${ticketId}/no-show`, { note }).then((r) => r.data),

  // round trip reports
  roundTrips: (q) => get(`/admin/round-trips${qs(q)}`),
  roundTrip: (id) => get(`/admin/round-trips/${id}`).then((r) => r.data),
  createRoundTrip: (b) => send("POST", "/admin/round-trips", b).then((r) => r.data),
  roundTripOptions: (q) => get(`/admin/round-trips/trip-options${qs(q)}`).then((r) => r.data),
  createRoundTripFromTrips: (b) => send("POST", "/admin/round-trips/from-trips", b),
  syncRoundTripVouchers: (id, includeEdited = false) => send("POST", `/admin/round-trips/${id}/sync-vouchers`, { includeEdited }),
  missingRoundTripVouchers: (id) => get(`/admin/round-trips/${id}/missing-vouchers`).then((r) => r.data),
  /** Plain-words warnings when a report's legs do not look like one journey (advice only). */
  roundTripChecks: (id) => get(`/admin/round-trips/${id}/checks`).then((r) => r.data),
  scanCompletedRoundTrips: () => send("POST", "/admin/round-trips/scan-completed").then((r) => r.data),
  updateRoundTrip: (id, b) => send("PATCH", `/admin/round-trips/${id}`, b).then((r) => r.data),
  deleteRoundTrip: (id) => send("DELETE", `/admin/round-trips/${id}`),
  finalizeRoundTrip: (id) => send("POST", `/admin/round-trips/${id}/finalize`).then((r) => r.data),
  addLeg: (id, b) => send("POST", `/admin/round-trips/${id}/legs`, b).then((r) => r.data),
  updateLeg: (id, legId, b) => send("PATCH", `/admin/round-trips/${id}/legs/${legId}`, b).then((r) => r.data),
  deleteLeg: (id, legId) => send("DELETE", `/admin/round-trips/${id}/legs/${legId}`).then((r) => r.data),
  addVoucher: (id, b) => send("POST", `/admin/round-trips/${id}/vouchers`, b),
  updateVoucher: (id, vid, b) => send("PATCH", `/admin/round-trips/${id}/vouchers/${vid}`, b).then((r) => r.data),
  deleteVoucher: (id, vid) => send("DELETE", `/admin/round-trips/${id}/vouchers/${vid}`).then((r) => r.data),
  saveFuel: (id, entries) => send("PUT", `/admin/round-trips/${id}/fuel`, { entries }).then((r) => r.data),
  setOffrouteLine: (id, lineId, b) => send("PATCH", `/admin/round-trips/${id}/offroute/${lineId}`, b).then((r) => r.data),
  defaultsPreview: (id) => get(`/admin/round-trips/${id}/offroute/defaults-preview`).then((r) => r.data),
  applyDefaults: (id, includeOverriddenIds) => send("POST", `/admin/round-trips/${id}/offroute/apply-defaults`, { includeOverriddenIds }),
  regenerateToken: (id, voucherId = null) => send("POST", `/admin/round-trips/${id}/regenerate-token`, { voucherId }).then((r) => r.data),
  reportScans: (id) => get(`/admin/round-trips/${id}/scans`).then((r) => r.data),
  vouchers: (q) => get(`/admin/vouchers${qs(q)}`),
  voucherSlip: (id) => get(`/admin/vouchers/${id}/slip`).then((r) => r.data),
  offrouteSettings: () => get("/admin/report-settings/offroute").then((r) => r.data),
  createOffroute: (b) => send("POST", "/admin/report-settings/offroute", b).then((r) => r.data),
  updateOffroute: (id, b) => send("PATCH", `/admin/report-settings/offroute/${id}`, b).then((r) => r.data),
  orderOffroute: (ids) => send("PUT", "/admin/report-settings/offroute-order", { ids }),
  setOffrouteDefault: (b) => send("PUT", "/admin/report-settings/offroute-defaults", b).then((r) => r.data),
  removeOffrouteDefault: (id) => send("DELETE", `/admin/report-settings/offroute-defaults/${id}`),
  reportList: (list) => get(`/admin/report-settings/lists/${list}`).then((r) => r.data),
  terminalDeductions: () => get("/admin/report-settings/terminal-deductions").then((r) => r.data),
  setTerminalDeduction: (b) => send("PUT", "/admin/report-settings/terminal-deductions", b).then((r) => r.data),
  addOffrouteLine: (id, b) => send("POST", `/admin/round-trips/${id}/offroute`, b).then((r) => r.data),
  removeOffrouteLine: (id, lineId) => send("DELETE", `/admin/round-trips/${id}/offroute/${lineId}`).then((r) => r.data),
  addReportListItem: (list, name) => send("POST", `/admin/report-settings/lists/${list}`, { name }).then((r) => r.data),
  updateReportListItem: (list, id, b) => send("PATCH", `/admin/report-settings/lists/${list}/${id}`, b).then((r) => r.data),

  // website content
  content: () => get("/admin/content").then((r) => r.data),
  saveContent: (key, value) => send("PUT", `/admin/content/${key}`, { value }).then((r) => r.data),
  resetContent: (key) => send("DELETE", `/admin/content/${key}`),
};
