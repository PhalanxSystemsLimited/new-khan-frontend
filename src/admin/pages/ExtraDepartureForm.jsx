/**
 * "Add extra departure" (Counter and Trips & boarding): one more departure on a busy day, on sale at once at the
 * counters and online. Counter staff only see routes leaving from their terminal (the server checks it too).
 *
 * The bus can be chosen now, or left to departure time: then the seat type (49- or 31-seater, and class) is what
 * the tickets are sold on and the bus is confirmed later in Bus & crew. Another departure on the same route within
 * 30 minutes is allowed, but only after a second "yes" (that also stops a double click adding two).
 */
import { useState } from "react";
import { toast } from "../../components/Toast";
import { adminApi } from "../api";
import { act, Btn, ErrorNote, formError, FormError, inFormSave, Input, Label, lastActError, Modal, pkLocalToIso, Select, useLoad } from "../ui";

const when = (ms) =>
  new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const msOf = (v) => {
  const t = v ? Date.parse(pkLocalToIso(v)) : NaN;
  return Number.isNaN(t) ? null : t;
};
const CLASS = { economy: "Economy", executive: "Executive", business: "Business", sleeper: "Sleeper" };
const className = (c) => CLASS[c] ?? c;
const typeKey = (t) => `${t.layoutId}|${t.busClass}`;

export default function ExtraDepartureForm({ terminalId, onClose, onCreated }) {
  const o = useLoad(() => adminApi.extraOptions(terminalId || undefined), [terminalId]);
  const [v, setV] = useState({ routeId: "", departureAt: "", busType: "", busId: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [near, setNear] = useState(null); // the server's "already a departure close to this" question

  const d = o.data;
  const routes = d?.routes ?? [];
  const types = d?.busTypes ?? [];
  const route = routes.find((r) => String(r.id) === String(v.routeId));
  const type = types.find((t) => typeKey(t) === v.busType);
  // Buses of the chosen seat type (all active buses when none is chosen).
  const buses = (d?.buses ?? []).filter((b) => !type || (b.layoutId === type.layoutId && b.busClass === type.busClass));
  const bus = buses.find((b) => String(b.id) === String(v.busId));
  const plannedAllowed = d?.plannedAllowed !== false;

  const set = (k, x) => {
    setNear(null);
    setV((p) => {
      const n = { ...p, [k]: x };
      // A bus that is not of the new seat type is cleared.
      if (k === "busType" && p.busId) {
        const t = types.find((tt) => typeKey(tt) === x);
        const b = (d?.buses ?? []).find((bb) => String(bb.id) === String(p.busId));
        if (t && b && (b.layoutId !== t.layoutId || b.busClass !== t.busClass)) n.busId = "";
      }
      return n;
    });
  };

  const leaves = msOf(v.departureAt);
  const arrives = route?.estDurationMinutes && leaves !== null ? leaves + route.estDurationMinutes * 60_000 : null;
  const need = (x) => (tried && !x ? "Required." : null);
  const problems = {
    routeId: need(v.routeId),
    departureAt: need(v.departureAt) ?? (tried && leaves !== null && leaves <= Date.now() ? "Must be in the future." : null),
    busType: tried && !v.busType && !v.busId ? (plannedAllowed ? "Choose the seat type, or a bus below." : null) : null,
    busId: tried && !plannedAllowed && !v.busId ? "Choose the bus." : null,
  };
  const serverMsg = (name) => err?.byField?.[name];

  async function save(allowNear) {
    setTried(true);
    if (Object.values(problems).some(Boolean) || !v.routeId || !v.departureAt || (!v.busType && !v.busId) || (!plannedAllowed && !v.busId)) return;
    if (leaves !== null && leaves <= Date.now()) return;
    const body = { routeId: Number(v.routeId), departureAt: pkLocalToIso(v.departureAt) };
    if (v.busId) body.busId = Number(v.busId);
    else {
      body.layoutId = type.layoutId;
      body.busClass = type.busClass;
    }
    if (allowNear) body.allowNear = true;
    setBusy(true);
    setErr(null);
    setNear(null);
    let res;
    const ok = await inFormSave(() => act(async () => { res = await adminApi.createExtra(body); }));
    setBusy(false);
    if (!ok) {
      const e = lastActError();
      if (e?.code === "NEAR_DEPARTURE") setNear(e.message);
      else setErr(formError(e));
      return;
    }
    toast("Extra departure added", {
      body: `${route?.name}, ${when(leaves)}. On sale now at the counters and online.${res?.planned ? " Confirm the bus at departure time (Bus & crew)." : ""}`,
      duration: 7000,
    });
    onCreated?.();
    onClose();
  }

  const field = (name, label, input, { required, hint, error } = {}) => (
    <div>
      <Label htmlFor={`x-${name}`}>{label}{required ? " *" : ""}</Label>
      {input}
      {(error ?? serverMsg(name)) && <p role="alert" className="mt-1 text-sm text-red-700">{error ?? serverMsg(name)}</p>}
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
  const opts = (list, first) => [{ value: "", label: first }, ...list];

  return (
    <Modal title="Add extra departure" onClose={onClose}>
      <ErrorNote err={o.err} onRetry={o.reload} />
      {!d && !o.err && <p className="text-sm text-mute">Loading…</p>}
      {d && (
        <form onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate className="grid gap-4">
          <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">
            One more departure for a busy day. It goes on sale at once, at the counters and online. Times are Pakistan time.
            For a departure every day, an admin adds it under Schedules & trips.
          </p>
          {routes.length === 0 && <p className="text-sm text-red-700">No active route leaves from this terminal.</p>}
          {field("routeId", "Route",
            <Select id="x-routeId" value={v.routeId} onChange={(e) => set("routeId", e.target.value)} options={opts(routes.map((r) => ({ value: r.id, label: r.name })), "— choose —")} />,
            { required: true, error: problems.routeId })}
          {field("departureAt", "Departs from first stop",
            <Input id="x-departureAt" type="datetime-local" value={v.departureAt} onChange={(e) => set("departureAt", e.target.value)} />,
            { required: true, error: problems.departureAt, hint: arrives !== null ? `Arrives ${route.name.split(/→|->/).pop().trim()} about ${when(arrives)}.` : undefined })}
          {field("busType", "Seat type",
            <Select id="x-busType" value={v.busType} onChange={(e) => set("busType", e.target.value)}
              options={opts(types.map((t) => ({ value: typeKey(t), label: `${t.layoutName} · ${className(t.busClass)} (${t.buses} bus${t.buses === 1 ? "" : "es"})` })), "— choose —")} />,
            { required: plannedAllowed && !v.busId, error: problems.busType, hint: "Tickets are sold on this seat plan. The bus that goes must have the same seat type." })}
          {field("busId", "Bus",
            <Select id="x-busId" value={v.busId} onChange={(e) => set("busId", e.target.value)}
              options={opts(buses.map((b) => ({ value: b.id, label: `${b.registrationNo}${b.fleetNo ? ` (${b.fleetNo})` : ""} · ${b.layoutName} · ${className(b.busClass)}` })), plannedAllowed ? "Decide at departure time (bus to confirm)" : "— choose —")} />,
            {
              required: !plannedAllowed,
              error: problems.busId,
              hint: bus ? "This bus is confirmed now: it must be free at that time." : plannedAllowed ? "Usually left open: choose the bus and crew at departure time in Bus & crew." : undefined,
            })}

          {near && (
            <div role="alert" className="grid gap-2 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">{near}</p>
              <div className="flex flex-wrap gap-2">
                <Btn kind="primary" disabled={busy} onClick={() => save(true)}>{busy ? "Saving…" : "Yes, add it"}</Btn>
                <Btn onClick={() => setNear(null)}>No, change the time</Btn>
              </div>
            </div>
          )}
          <FormError err={err} />
          {!near && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Add departure"}</Btn>
              <Btn onClick={onClose}>Cancel</Btn>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
