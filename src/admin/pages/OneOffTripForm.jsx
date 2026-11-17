/**
 * "+ One-off trip" on Trips & boarding: one extra departure, and optionally the same bus's return trip
 * ("Also add the return trip"). Both trips are saved together by the server: both or neither.
 * Its own small form (not FormModal) because the return fields show and hide, and the arrival times are worked out
 * while typing.
 */
import { useState } from "react";
import { toast } from "../../components/Toast";
import { adminApi } from "../api";
import { act, Btn, formError, FormError, inFormSave, Input, Label, lastActError, Modal, pkLocalToIso, Select } from "../ui";

/** A return leaving sooner than this after the bus arrives gets a warning (the server says the same). */
const SHORT_TURNAROUND_MINUTES = 30;

const when = (ms) =>
  new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
/** Milliseconds of a datetime-local value read as Pakistan time, or null. */
const msOf = (v) => {
  const t = v ? Date.parse(pkLocalToIso(v)) : NaN;
  return Number.isNaN(t) ? null : t;
};
const minutesText = (m) => (m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`);

/** The routes the bus can come back on: those starting where `out` ends, the ones going back to its start first. */
export function returnRouteChoices(routes, out) {
  if (!out) return [];
  const starts = routes.filter((r) => r.isActive && r.originCityId === out.destinationCityId && r.id !== out.id);
  const back = starts.filter((r) => r.destinationCityId === out.originCityId);
  return [...back, ...starts.filter((r) => !back.includes(r))];
}

export default function OneOffTripForm({ routes, buses, drivers, onClose, onCreated }) {
  const [v, setV] = useState({ routeId: "", busId: "", driverId: "", departureAt: "", withReturn: false, returnRouteId: "", returnDepartureAt: "", returnDriverId: "" });
  const [returnDriverTouched, setReturnDriverTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const activeRoutes = routes.filter((r) => r.isActive);
  const routeById = (id) => routes.find((r) => String(r.id) === String(id));
  const out = routeById(v.routeId);
  const back = routeById(v.returnRouteId);
  const choices = returnRouteChoices(routes, out);
  const driverOpts = drivers.filter((d) => d.isActive && !d.licenseExpired).map((d) => ({ value: d.id, label: d.fullName }));
  const busName = buses.find((b) => String(b.id) === String(v.busId))?.registrationNo ?? "The bus";

  /** The return route that fits a new outbound route (kept when it still fits). */
  const fitReturn = (outRoute, current) => {
    const list = returnRouteChoices(routes, outRoute);
    return list.some((r) => String(r.id) === String(current)) ? current : String(list[0]?.id ?? "");
  };
  const set = (k, x) =>
    setV((p) => {
      const n = { ...p, [k]: x };
      if (k === "routeId" || (k === "withReturn" && x)) n.returnRouteId = fitReturn(routeById(n.routeId), p.returnRouteId);
      if (k === "driverId" && !returnDriverTouched) n.returnDriverId = x;
      return n;
    });

  const leaves = msOf(v.departureAt);
  const arrives = out?.estDurationMinutes && leaves !== null ? leaves + out.estDurationMinutes * 60_000 : null;
  const backLeaves = msOf(v.returnDepartureAt);
  const backArrives = back?.estDurationMinutes && backLeaves !== null ? backLeaves + back.estDurationMinutes * 60_000 : null;
  const turnaround = arrives !== null && backLeaves !== null ? Math.round((backLeaves - arrives) / 60_000) : null;

  // Messages shown inside the form (red ones stop the save).
  const need = (x) => (tried && !x ? "Required." : null);
  const problems = {
    routeId: need(v.routeId),
    busId: need(v.busId),
    departureAt: need(v.departureAt) ?? (tried && leaves !== null && leaves <= Date.now() ? "Must be in the future." : null),
    returnRouteId: v.withReturn
      ? (out && !choices.length ? `No active route starts in ${out.destinationCity}. Add one under Routes & stops first.` : need(v.returnRouteId))
      : null,
    returnDepartureAt: v.withReturn
      ? (need(v.returnDepartureAt) ??
        (turnaround !== null && turnaround < 0 ? `${busName} only reaches ${out.destinationCity} at ${when(arrives)}. The return must leave at or after that time.` : null))
      : null,
  };
  const blocked = Object.values(problems).some(Boolean) || (v.withReturn && turnaround !== null && turnaround < 0);
  const serverMsg = (name) => err?.byField?.[name];

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    const missing = !v.routeId || !v.busId || !v.departureAt || (v.withReturn && (!v.returnRouteId || !v.returnDepartureAt));
    if (missing || blocked || (leaves !== null && leaves <= Date.now())) return;
    const body = { routeId: Number(v.routeId), busId: Number(v.busId), departureAt: pkLocalToIso(v.departureAt) };
    if (v.driverId) body.driverId = Number(v.driverId);
    if (v.withReturn) {
      body.returnTrip = { routeId: Number(v.returnRouteId), departureAt: pkLocalToIso(v.returnDepartureAt) };
      if (v.returnDriverId) body.returnTrip.driverId = Number(v.returnDriverId);
    }
    setBusy(true);
    setErr(null);
    let res;
    const ok = await inFormSave(() => act(async () => { res = await adminApi.createOneOffTrip(body); }));
    setBusy(false);
    if (!ok) {
      const fe = formError(lastActError());
      const details = lastActError()?.details ?? [];
      // The server names the return fields "returnRouteId" / "returnDepartureAt" (or "returnTrip.x" when validating).
      for (const d of details) {
        const f = String(d?.field ?? "");
        if (f === "returnTrip.routeId") fe.byField.returnRouteId ??= d.message;
        if (f === "returnTrip.departureAt") fe.byField.returnDepartureAt ??= d.message;
        if (f === "returnRouteId" || f === "returnDepartureAt") fe.byField[f] = d.message;
      }
      setErr(fe);
      return;
    }
    const two = Boolean(res?.returnTrip);
    toast(two ? "2 trips created" : "Trip created", {
      body: two ? `${out?.name}, ${when(leaves)} and back: ${back?.name}, ${when(backLeaves)}. Same bus.` : "",
      duration: 5000,
    });
    for (const w of res?.warnings ?? []) toast("Check the return time", { body: w, kind: "info", duration: 9000 });
    onCreated?.();
    onClose();
  }

  const field = (name, label, input, { required, hint, error, warn } = {}) => (
    <div>
      <Label htmlFor={`f-${name}`}>{label}{required ? " *" : ""}</Label>
      {input}
      {(error ?? serverMsg(name)) && <p role="alert" className="mt-1 text-sm text-red-700">{error ?? serverMsg(name)}</p>}
      {warn && <p className="mt-1 rounded-lg border border-amber-500 bg-amber-50 px-2 py-1 text-sm text-amber-900">{warn}</p>}
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
  const opts = (list, required) => [{ value: "", label: required ? "— choose —" : "—" }, ...list];

  return (
    <Modal title="Add a one-off trip" onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">For regular departures use Schedules & trips instead. Times are Pakistan time.</p>
        {field("routeId", "Route",
          <Select id="f-routeId" value={v.routeId} onChange={(e) => set("routeId", e.target.value)} options={opts(activeRoutes.map((r) => ({ value: r.id, label: r.name })), true)} />,
          { required: true, error: problems.routeId })}
        {field("busId", "Bus",
          <Select id="f-busId" value={v.busId} onChange={(e) => set("busId", e.target.value)} options={opts(buses.filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo} · ${b.layoutName}` })), true)} />,
          { required: true, error: problems.busId })}
        {field("driverId", "Driver",
          <Select id="f-driverId" value={v.driverId} onChange={(e) => set("driverId", e.target.value)} options={opts(driverOpts)} />)}
        {field("departureAt", "Departs from first stop",
          <Input id="f-departureAt" type="datetime-local" value={v.departureAt} onChange={(e) => set("departureAt", e.target.value)} />,
          { required: true, error: problems.departureAt, hint: arrives !== null ? `Arrives ${out.destinationCity} about ${when(arrives)}.` : undefined })}

        <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-neutral-400 p-3 text-sm font-semibold">
          <input type="checkbox" id="f-withReturn" checked={v.withReturn} onChange={(e) => set("withReturn", e.target.checked)} className="h-5 w-5 accent-black" />
          Also add the return trip (same bus)
        </label>

        {v.withReturn && (
          <div className="grid gap-4 border-s-4 border-neutral-300 ps-4">
            {field("returnRouteId", "Return route",
              <Select id="f-returnRouteId" value={v.returnRouteId} onChange={(e) => set("returnRouteId", e.target.value)} options={opts(choices.map((r) => ({ value: r.id, label: r.name })), true)} />,
              { required: true, error: problems.returnRouteId, hint: out ? `Routes that start in ${out.destinationCity}, where the bus arrives.` : "Choose the route above first." })}
            {field("returnDepartureAt", "Return departs",
              <Input id="f-returnDepartureAt" type="datetime-local" value={v.returnDepartureAt} onChange={(e) => set("returnDepartureAt", e.target.value)} />,
              {
                required: true,
                error: problems.returnDepartureAt,
                warn: turnaround !== null && turnaround >= 0 && turnaround < SHORT_TURNAROUND_MINUTES
                  ? `Only ${minutesText(turnaround)} after the bus arrives. Allowed, but any delay on the way will make the return late.`
                  : undefined,
                // The red message already gives the arrival time, so no hint with it.
                hint: turnaround !== null && turnaround < 0
                  ? undefined
                  : backArrives !== null && (turnaround === null || turnaround >= 0)
                    ? `Arrives ${back.destinationCity} about ${when(backArrives)}.`
                    : arrives !== null ? `${busName} reaches ${out.destinationCity} about ${when(arrives)}.` : undefined,
              })}
            {field("returnDriverId", "Return driver",
              <Select id="f-returnDriverId" value={v.returnDriverId} onChange={(e) => { setReturnDriverTouched(true); set("returnDriverId", e.target.value); }} options={opts(driverOpts)} />,
              { hint: "Same driver as the outbound unless you change it." })}
          </div>
        )}

        <FormError err={err} />
        <div className="flex flex-wrap gap-2 pt-1">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : v.withReturn ? "Create 2 trips" : "Create trip"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}
