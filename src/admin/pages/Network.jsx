/** Network: routes and their stops, fares between stops, schedules and trip generation. */
import { useMemo, useState } from "react";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, Filters, fmtD, Input, Label, Modal, Page, pkDate, rs, Select, StatusBadge, Table, useForm, useLoad,
} from "../ui";

export const BUS_CLASSES = ["economy", "executive", "business", "sleeper"].map((c) => ({ value: c, label: c }));
const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/* ------------------------------------------------------------------ routes */

/** Ordered stop list editor: terminal, minutes from the first stop, km, boards/drops passengers. */
function StopsEditor({ title, route, terminals, onClose, onSaved, isNew }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [stops, setStops] = useState(() =>
    route?.stops?.length
      ? route.stops.map((s) => ({ terminalId: s.terminalId, minutesFromOrigin: s.minutesFromOrigin, kmFromOrigin: Number(s.kmFromOrigin ?? 0), isBoardingPoint: s.isBoardingPoint, isDroppingPoint: s.isDroppingPoint }))
      : [
          { terminalId: "", minutesFromOrigin: 0, kmFromOrigin: 0, isBoardingPoint: true, isDroppingPoint: false },
          { terminalId: "", minutesFromOrigin: 60, kmFromOrigin: 0, isBoardingPoint: false, isDroppingPoint: true },
        ],
  );
  const [busy, setBusy] = useState(false);
  const set = (i, k, v) => setStops((a) => a.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const move = (i, d) => setStops((a) => { const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b; });
  const opts = [{ value: "", label: "Choose terminal" }, ...terminals.map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))];

  async function save() {
    const body = stops.map((s) => ({ ...s, terminalId: Number(s.terminalId), minutesFromOrigin: Number(s.minutesFromOrigin), kmFromOrigin: Number(s.kmFromOrigin) || 0 }));
    setBusy(true);
    const ok = await act(
      () => (isNew ? adminApi.createRoute({ code: code.trim().toUpperCase(), name: name.trim(), stops: body }) : adminApi.replaceStops(route.id, body)),
      isNew ? "Route created" : "Stops saved",
    );
    setBusy(false);
    if (ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <Modal wide title={title} onClose={onClose}>
      {isNew ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="r-code">Code *</Label><Input id="r-code" placeholder="NK-LHR-MWI" value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div><Label htmlFor="r-name">Name *</Label><Input id="r-name" placeholder="Lahore → Mianwali" value={name} onChange={(e) => setName(e.target.value)} /></div>
        </div>
      ) : (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Stops can only be replaced while the route has no bookings. Once it has bookings, create a new route and switch the old one off.</p>
      )}
      <p className="mb-2 text-sm text-mute">In travel order. The first stop is at 0 minutes; each next stop must be later. Customers can only board at "Boards" stops and get off at "Drops" stops.</p>
      <div className="grid gap-2">
        {stops.map((s, i) => (
          <div key={i} className="grid items-end gap-2 rounded-xl border border-neutral-300 p-2 sm:grid-cols-[2rem_1fr_7rem_6rem_auto_auto]">
            <span className="text-center font-bold">{i + 1}</span>
            <Select aria-label="Terminal" value={s.terminalId} onChange={(e) => set(i, "terminalId", e.target.value)} options={opts} />
            <div><Label>Minutes</Label><Input type="number" min={0} value={s.minutesFromOrigin} onChange={(e) => set(i, "minutesFromOrigin", e.target.value)} /></div>
            <div><Label>Km</Label><Input type="number" min={0} value={s.kmFromOrigin} onChange={(e) => set(i, "kmFromOrigin", e.target.value)} /></div>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" className="accent-black" checked={s.isBoardingPoint} onChange={(e) => set(i, "isBoardingPoint", e.target.checked)} />Boards</label>
              <label className="flex items-center gap-1"><input type="checkbox" className="accent-black" checked={s.isDroppingPoint} onChange={(e) => set(i, "isDroppingPoint", e.target.checked)} />Drops</label>
            </div>
            <div className="flex gap-1">
              <Btn small disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</Btn>
              <Btn small disabled={i === stops.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</Btn>
              <Btn small kind="danger" disabled={stops.length <= 2} onClick={() => setStops((a) => a.filter((_, j) => j !== i))} aria-label="Remove">✕</Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => setStops((a) => [...a, { terminalId: "", minutesFromOrigin: Number(a[a.length - 1]?.minutesFromOrigin ?? 0) + 60, kmFromOrigin: 0, isBoardingPoint: true, isDroppingPoint: true }])}>+ Add stop</Btn>
        <Btn kind="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : isNew ? "Create route" : "Save stops"}</Btn>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
    </Modal>
  );
}

export function RoutesPage() {
  const routes = useLoad(() => adminApi.routes(), []);
  const locs = useLoad(() => adminApi.locations(), []);
  const terminals = (locs.data?.terminals ?? []).filter((t) => t.isActive);
  const [editor, setEditor] = useState(null);
  const [openForm, form] = useForm();

  const openStops = async (r) => {
    try {
      setEditor({ route: await adminApi.route(r.id), title: `Stops · ${r.name}` });
    } catch (e) {
      act(() => Promise.reject(e));
    }
  };
  const edit = (r) =>
    openForm({
      title: `Edit ${r.code}`,
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "distanceKm", label: "Distance (km)", type: "number", min: 1 },
        { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Route is in service (shown in search)" },
      ],
      initial: { name: r.name, distanceKm: r.distanceKm ?? "", isActive: r.isActive },
      onSubmit: (b) => act(() => adminApi.updateRoute(r.id, b), "Route saved").then((ok) => (ok && routes.reload(), ok)),
    });

  return (
    <Page
      title="Routes & stops"
      intro="A route is the ordered list of terminals a bus passes. Searches and fares are built on routes."
      actions={<Btn kind="primary" onClick={() => setEditor({ isNew: true, title: "New route" })}>+ New route</Btn>}
    >
      <ErrorNote err={routes.err || locs.err} onRetry={routes.reload} />
      <Table
        loading={routes.loading}
        rows={routes.data}
        cols={[
          { key: "code", label: "Code", render: (r) => <span className="font-mono">{r.code}</span> },
          { key: "name", label: "Name", render: (r) => <b>{r.name}</b> },
          { key: "ends", label: "From → to", render: (r) => `${r.originTerminal} → ${r.destinationTerminal}` },
          { key: "stopCount", label: "Stops" },
          { key: "dur", label: "Duration", render: (r) => (r.estDurationMinutes ? hm(r.estDurationMinutes) : "–") },
          { key: "distanceKm", label: "Km" },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          { key: "a", label: "", render: (r) => <div className="flex gap-1"><Btn small onClick={() => openStops(r)}>Stops</Btn><Btn small onClick={() => edit(r)}>Edit</Btn></div> },
        ]}
      />
      {editor && <StopsEditor {...editor} terminals={terminals} onClose={() => setEditor(null)} onSaved={routes.reload} />}
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ fares */

export function Fares() {
  const routes = useLoad(() => adminApi.routes(), []);
  const [routeId, setRouteId] = useState("");
  const rid = routeId || routes.data?.find((r) => r.isActive)?.id || "";
  const detail = useLoad(() => (rid ? adminApi.route(rid) : Promise.resolve(null)), [rid]);
  const fares = useLoad(() => (rid ? adminApi.fares(rid) : Promise.resolve([])), [rid]);
  const [cls, setCls] = useState("executive");
  const [openForm, form] = useForm();

  const stops = detail.data?.stops ?? [];
  const missing = useMemo(() => {
    const have = new Set((fares.data ?? []).filter((f) => f.busClass === cls).map((f) => `${f.fromStopId}-${f.toStopId}`));
    const out = [];
    for (const a of stops) for (const b of stops) if (a.stopOrder < b.stopOrder && a.isBoardingPoint && b.isDroppingPoint && !have.has(`${a.id}-${b.id}`)) out.push([a, b]);
    return out;
  }, [stops, fares.data, cls]);

  const add = (from, to) =>
    openForm({
      title: "Set a fare",
      note: "Price per seat between two stops for one bus class. Applies to new bookings from the 'valid from' date.",
      fields: [
        { name: "fromStopId", label: "From", type: "select", numeric: true, required: true, options: stops.map((s) => ({ value: s.id, label: `${s.stopOrder}. ${s.terminalName}` })) },
        { name: "toStopId", label: "To", type: "select", numeric: true, required: true, options: stops.map((s) => ({ value: s.id, label: `${s.stopOrder}. ${s.terminalName}` })) },
        { name: "busClass", label: "Bus class", type: "select", required: true, options: BUS_CLASSES },
        { name: "amount", label: "Fare (Rs)", type: "number", required: true, min: 0 },
        { name: "validFrom", label: "Valid from", type: "date", hint: "Blank = today." },
        { name: "validTo", label: "Valid to", type: "date", hint: "Blank = no end date." },
      ],
      initial: { fromStopId: from?.id ?? "", toStopId: to?.id ?? "", busClass: cls },
      onSubmit: (b) => act(() => adminApi.createFare({ ...b, routeId: Number(rid) }), "Fare saved").then((ok) => (ok && fares.reload(), ok)),
    });

  const edit = (f) =>
    openForm({
      title: `Fare · ${f.fromTerminal} → ${f.toTerminal}`,
      note: "Changing the amount affects new bookings only. To schedule a price change, set 'valid to' here and add a new fare from the next day.",
      fields: [
        { name: "amount", label: "Fare (Rs)", type: "number", required: true, min: 0 },
        { name: "validTo", label: "Valid to", type: "date", nullable: true, hint: "Blank = no end date." },
      ],
      initial: { amount: f.amount, validTo: f.validTo ?? "" },
      onSubmit: (b) => act(() => adminApi.updateFare(f.id, b), "Fare saved").then((ok) => (ok && fares.reload(), ok)),
    });

  return (
    <Page title="Fares" intro="Booking prices come from this table. A trip between two stops is only bookable when a fare exists for the bus's class." actions={rid && <Btn kind="primary" onClick={() => add()}>+ Set fare</Btn>}>
      <Filters>
        <div>
          <Label htmlFor="f-route">Route</Label>
          <Select id="f-route" value={rid} onChange={(e) => setRouteId(e.target.value)} options={(routes.data ?? []).map((r) => ({ value: r.id, label: `${r.name}${r.isActive ? "" : " (off)"}` }))} />
        </div>
        <div>
          <Label htmlFor="f-cls">Class (for missing list)</Label>
          <Select id="f-cls" value={cls} onChange={(e) => setCls(e.target.value)} options={BUS_CLASSES} />
        </div>
      </Filters>
      <ErrorNote err={routes.err || detail.err || fares.err} />
      <Table
        loading={fares.loading}
        rows={fares.data}
        empty="No fares on this route yet."
        cols={[
          { key: "j", label: "From → to", render: (r) => `${r.fromTerminal} → ${r.toTerminal}` },
          { key: "busClass", label: "Class" },
          { key: "amount", label: "Fare", render: (r) => <b>{rs(r.amount)}</b> },
          { key: "validFrom", label: "From", render: (r) => fmtD(r.validFrom) },
          { key: "validTo", label: "To", render: (r) => (r.validTo ? fmtD(r.validTo) : "no end") },
          { key: "a", label: "", render: (r) => <Btn small onClick={() => edit(r)}>Edit</Btn> },
        ]}
      />
      {missing.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">{missing.length} stop pair(s) have no {cls} fare, so they can't be booked on {cls} buses:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missing.map(([a, b]) => (
              <Btn key={`${a.id}-${b.id}`} small onClick={() => add(a, b)}>{a.terminalName} → {b.terminalName}</Btn>
            ))}
          </div>
        </div>
      )}
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ schedules */

export function Schedules() {
  const list = useLoad(() => adminApi.schedules(), []);
  const routes = useLoad(() => adminApi.routes(), []);
  const buses = useLoad(() => adminApi.buses(), []);
  const [openForm, form] = useForm();
  const [result, setResult] = useState(null);

  const routeOpts = (routes.data ?? []).filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name }));
  const busOpts = (buses.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo}${b.fleetNo ? ` (${b.fleetNo})` : ""} · ${b.busClass}` }));
  const fields = (isNew) => [
    ...(isNew ? [{ name: "routeId", label: "Route", type: "select", numeric: true, required: true, options: routeOpts }] : []),
    { name: "departureTime", label: "Departs (from first stop, Pakistan time)", type: "time", required: true },
    { name: "busClass", label: "Bus class", type: "select", required: true, options: BUS_CLASSES },
    { name: "defaultBusId", label: "Default bus", type: "select", numeric: true, nullable: true, options: busOpts, hint: "Needed to generate trips." },
    { name: "daysOfWeek", label: "Runs on", type: "days" },
    { name: "effectiveFrom", label: "From date", type: "date" },
    { name: "effectiveTo", label: "Until date", type: "date", nullable: true, hint: "Blank = no end." },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Schedule is in use" },
  ];

  const add = () =>
    openForm({
      title: "New schedule",
      fields: fields(true),
      initial: { busClass: "executive", daysOfWeek: [1, 2, 3, 4, 5, 6, 7], isActive: true },
      onSubmit: (b) => act(() => adminApi.createSchedule(b), "Schedule created").then((ok) => (ok && list.reload(), ok)),
    });
  const edit = (s) =>
    openForm({
      title: `Edit · ${s.routeName} ${s.departureTime.slice(0, 5)}`,
      note: "Changes apply to trips generated from now on. Trips already created keep their bus and time (change them in Trips).",
      fields: fields(false),
      initial: { ...s, departureTime: s.departureTime.slice(0, 5), defaultBusId: s.defaultBusId ?? "", effectiveTo: s.effectiveTo ?? "", effectiveFrom: s.effectiveFrom?.slice(0, 10) ?? "" },
      onSubmit: (b) => act(() => adminApi.updateSchedule(s.id, b), "Schedule saved").then((ok) => (ok && list.reload(), ok)),
    });
  const generate = (s) =>
    openForm({
      title: `Create trips · ${s.routeName} ${s.departureTime.slice(0, 5)}`,
      note: "Creates a bookable trip for each running day in the range (up to 92 days). Days that already have this trip are skipped, so it is safe to run again.",
      fields: [
        { name: "fromDate", label: "From", type: "date", required: true },
        { name: "toDate", label: "To", type: "date", required: true },
        { name: "bookingCloseMinutes", label: "Online booking closes (minutes before departure)", type: "number", min: 0, max: 720 },
      ],
      initial: { fromDate: pkDate(), toDate: pkDate(30), bookingCloseMinutes: 30 },
      submitLabel: "Create trips",
      onSubmit: async (b) => {
        let n = 0;
        const ok = await act(async () => {
          n = (await adminApi.generateTrips(s.id, b)).data.created;
        }, "Trips created");
        if (ok) setResult(`${n} new trip(s) created for ${s.routeName} at ${s.departureTime.slice(0, 5)}.`);
        return ok;
      },
    });

  return (
    <Page title="Schedules & trips" intro="A schedule is a regular departure (route, time, days). Trips are the dated departures customers book; create them from a schedule." actions={<Btn kind="primary" onClick={add}>+ New schedule</Btn>}>
      {result && <p role="status" className="mb-4 rounded-xl border border-green-600 bg-green-50 p-3 text-sm font-semibold text-green-900">{result}</p>}
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data}
        cols={[
          { key: "routeName", label: "Route", render: (r) => <b>{r.routeName}</b> },
          { key: "departureTime", label: "Departs", render: (r) => r.departureTime.slice(0, 5) },
          { key: "busClass", label: "Class" },
          { key: "days", label: "Days", render: (r) => (r.daysOfWeek?.length === 7 ? "Daily" : (r.daysOfWeek ?? []).map((d) => DAY[d]).join(" ")) },
          { key: "defaultBus", label: "Default bus", render: (r) => r.defaultBus ?? <Badge tone="amber">none</Badge> },
          { key: "eff", label: "Runs", render: (r) => `${fmtD(r.effectiveFrom)} → ${r.effectiveTo ? fmtD(r.effectiveTo) : "no end"}` },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          { key: "a", label: "", render: (r) => <div className="flex gap-1"><Btn small kind="primary" disabled={!r.isActive} onClick={() => generate(r)}>Create trips</Btn><Btn small onClick={() => edit(r)}>Edit</Btn></div> },
        ]}
      />
      {form}
    </Page>
  );
}
