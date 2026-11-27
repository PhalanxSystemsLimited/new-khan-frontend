/** Network: routes and their stops, fares between stops, schedules and trip generation. */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { toast } from "../../components/Toast";
import RoutePicker, { describeRoute, emptyRouteChoice, useRouteBuilder } from "./RoutePicker";
import { RouteEditor, RouteTimetable } from "./RouteEditor";
import {
  act, Badge, Btn, DeleteBtn, ErrorNote, Filters, fmtD, fmtDT, Input, Label, Modal, Page, pkDate, rs, Select, StatusBadge, Table, useConfirm, useDelete, useForm, useLoad,
} from "../ui";

export const BUS_CLASSES = ["economy", "executive", "business", "sleeper"].map((c) => ({ value: c, label: c }));
const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/* ------------------------------------------------------------------ routes */

export function RoutesPage() {
  const routes = useLoad(() => adminApi.routes(), []);
  const locs = useLoad(() => adminApi.locations(), []);
  const terminals = (locs.data?.terminals ?? []).filter((t) => t.isActive);
  const [editor, setEditor] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [openForm, form] = useForm();
  const [del, delNode] = useDelete();

  // The route with its stops, and its schedules (their departure times are offered as "leaving at").
  const loadRoute = async (r) => {
    const [route, all] = await Promise.all([adminApi.route(r.id), adminApi.schedules()]);
    return { route, schedules: (all ?? []).filter((s) => s.routeId === r.id) };
  };
  const openStops = async (r) => {
    try {
      setEditor({ ...(await loadRoute(r)), title: `Stops & times · ${r.name}` });
    } catch (e) {
      act(() => Promise.reject(e));
    }
  };
  const openTimetable = async (r) => {
    try {
      setTimetable(await loadRoute(r));
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
      intro="A route is the ordered list of terminals a bus passes, with the travel time between them and the stay at each. Searches and fares are built on routes."
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
          {
            key: "a",
            label: "",
            render: (r) => (
              <div className="flex gap-1">
                <Btn small onClick={() => openTimetable(r)} aria-label={`Timetable of route ${r.code}`}>Timetable</Btn>
                <Btn small onClick={() => openStops(r)} aria-label={`Stops and times of route ${r.code}`}>Stops &amp; times</Btn>
                <Btn small onClick={() => edit(r)}>Edit</Btn>
                <DeleteBtn
                  aria-label={`Delete route ${r.code}`}
                  onClick={() => del({
                    title: `Delete route ${r.code}?`,
                    body: 'Its stops and fares are deleted with it. Only possible while no trip, schedule or promo code uses the route; otherwise untick "Active" in Edit.',
                    run: () => adminApi.deleteRoute(r.id),
                    done: routes.reload,
                    okBody: `Route ${r.code} deleted, with its stops and fares.`,
                  })}
                />
              </div>
            ),
          },
        ]}
      />
      {editor && <RouteEditor {...editor} terminals={terminals} onClose={() => setEditor(null)} onSaved={routes.reload} />}
      {timetable && <RouteTimetable {...timetable} onClose={() => setTimetable(null)} />}
      {form}
      {delNode}
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
  const [del, delNode] = useDelete();

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
          {
            key: "a",
            label: "",
            render: (r) => (
              <div className="flex gap-1">
                <Btn small onClick={() => edit(r)}>Edit</Btn>
                <DeleteBtn
                  aria-label={`Delete fare ${r.fromTerminal} to ${r.toTerminal}, ${r.busClass}`}
                  onClick={() => del({
                    title: `Delete the ${r.busClass} fare ${r.fromTerminal} → ${r.toTerminal}?`,
                    body: "Seats already sold keep their price. Without a fare, this stop pair cannot be booked on this class until a new fare is set.",
                    run: () => adminApi.deleteFare(r.id),
                    done: fares.reload,
                  })}
                />
              </div>
            ),
          },
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
  const builder = useRouteBuilder();
  const [built, setBuilt] = useState(null); // the route of a schedule made with "Choose locations"
  const [del, delNode] = useDelete();

  const busOpts = (buses.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo}${b.fleetNo ? ` (${b.fleetNo})` : ""} · ${b.busClass}` }));
  // The open form keeps the field list it was opened with, so it reads the routes and terminals through this:
  // they may still be loading (or be reloaded) while the form is open.
  const live = useRef({ builder, routes: [] });
  live.current = { builder, routes: routes.data ?? [] };
  const pickedRoute = (choice) => describeRoute(choice, live.current.builder, live.current.routes);
  const fields = (isNew) => [
    // A saved route, or locations chosen one by one (RoutePicker).
    ...(isNew
      ? [{
          name: "route",
          type: "custom",
          errorFields: ["routeId", "customRoute"],
          problem: (choice) => pickedRoute(choice).problem,
          render: (choice, setChoice, { tried, error }) => (
            <RoutePicker choice={choice} onChange={setChoice} builder={live.current.builder} routes={live.current.routes} showProblems={tried} serverError={error} />
          ),
        }]
      : []),
    { name: "departureTime", label: "Departs (from first stop, Pakistan time)", type: "time", required: true },
    { name: "busClass", label: "Bus class", type: "select", required: true, options: BUS_CLASSES },
    { name: "defaultBusId", label: "Default bus", type: "select", numeric: true, nullable: true, options: busOpts, hint: "Needed to generate trips." },
    { name: "daysOfWeek", label: "Runs on", type: "days" },
    { name: "effectiveFrom", label: "From date", type: "date" },
    { name: "effectiveTo", label: "Until date", type: "date", nullable: true, hint: "Blank = no end." },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Schedule is in use" },
  ];

  const add = () => {
    builder.reload(); // a terminal added under Locations since this page opened
    openForm({
      title: "New schedule",
      fields: fields(true),
      initial: { route: emptyRouteChoice(), busClass: "executive", daysOfWeek: [1, 2, 3, 4, 5, 6, 7], isActive: true },
      onSubmit: async ({ route, ...b }) => {
        let made = null;
        const ok = await act(async () => {
          made = (await adminApi.createSchedule({ ...b, ...pickedRoute(route).body })).route;
        }, "Schedule created");
        if (ok) {
          list.reload();
          setResult(null);
          // Locations were chosen: say which route the schedule is on, and that a new route still needs fares.
          setBuilt(made ?? null);
          if (made?.created) {
            routes.reload();
            builder.reload();
          }
        }
        return ok;
      },
    });
  };
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
      note: "Creates a bookable trip for each running day in the range (up to 92 days). Days that already have this trip are skipped, so it is safe to run again. Tickets are sold on the departure: the default bus is only the planned bus (its seat type and class), and the bus that goes is confirmed at departure time in Trips & boarding → Bus & crew.",
      fields: [
        { name: "fromDate", label: "From", type: "date", required: true },
        { name: "toDate", label: "To", type: "date", required: true },
        { name: "bookingCloseMinutes", label: "Online booking closes (minutes before departure)", type: "number", min: 0, max: 720 },
      ],
      initial: { fromDate: pkDate(), toDate: pkDate(30), bookingCloseMinutes: 30 },
      submitLabel: "Create trips",
      onSubmit: async (b) => {
        let r = null;
        const ok = await act(async () => {
          r = (await adminApi.generateTrips(s.id, b)).data;
        }, "Trips created");
        if (ok && r) {
          const parts = [`${r.created} new trip${r.created === 1 ? "" : "s"} created for ${s.routeName} at ${s.departureTime.slice(0, 5)}`];
          if (r.alreadyThere) parts.push(`${r.alreadyThere} day${r.alreadyThere === 1 ? " was" : "s were"} already there`);
          const tail = r.busToConfirm && r.created ? ` On sale now. Bus ${r.bus} is the planned bus: confirm the bus that goes at departure time (Bus & crew).` : "";
          setBuilt(null);
          setResult({ text: `${parts.join("; ")}.${tail}`, bus: r.bus, skipped: r.skipped ?? [] });
        }
        return ok;
      },
    });

  return (
    <Page title="Schedules & trips" intro="A schedule is a regular departure (route, time, days). Trips are the dated departures customers book; create them from a schedule." actions={<Btn kind="primary" onClick={add}>+ New schedule</Btn>}>
      {built && (
        <p role="status" className={`mb-4 rounded-xl border-2 p-3 text-sm ${built.hasFares ? "border-green-600 bg-green-50 text-green-900" : "border-amber-500 bg-amber-50 text-amber-900"}`}>
          {built.created
            ? <>New route <b>{built.name}</b> ({built.code}) was created for this schedule. </>
            : <>The schedule is on the saved route <b>{built.name}</b> ({built.code}). </>}
          {!built.hasFares && <>It has no fares yet, so its trips cannot be booked: <Link to="/admin/fares" className="font-bold underline">set them on the Fares page</Link>.</>}
        </p>
      )}
      {result && <p role="status" className="mb-4 rounded-xl border border-green-600 bg-green-50 p-3 text-sm font-semibold text-green-900">{result.text}</p>}
      {result?.skipped.length > 0 && (
        <div role="status" className="mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-bold">
            {result.skipped.length} day{result.skipped.length === 1 ? " was" : "s were"} skipped because bus {result.bus} is busy then:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {result.skipped.map((k) => (
              <li key={k.date}>
                <b>{fmtD(k.departureAt)}</b>
                {k.clashTripId
                  ? <>: on trip {k.clashTripId} ({k.clashRoute}, leaves {fmtDT(k.clashDepartureAt)})</>
                  : <>: still on this schedule's trip from the day before</>}
              </li>
            ))}
          </ul>
          <p className="mt-1">Add these days with another bus from Trips & boarding → "+ One-off trip", or free the bus and run Create trips again.</p>
        </div>
      )}
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
          {
            key: "a",
            label: "",
            render: (r) => (
              <div className="flex gap-1">
                <Btn small kind="primary" disabled={!r.isActive} onClick={() => generate(r)}>Create trips</Btn>
                <Btn small onClick={() => edit(r)}>Edit</Btn>
                <DeleteBtn
                  aria-label={`Delete schedule ${r.routeName} ${r.departureTime.slice(0, 5)}`}
                  onClick={() => del({
                    title: `Delete the ${r.departureTime.slice(0, 5)} schedule of ${r.routeName}?`,
                    body: "No more trips can be created from it. Trips already created stay as they are, with their bookings: cancel any you do not want on the Trips page.",
                    run: () => adminApi.deleteSchedule(r.id),
                    done: list.reload,
                    okBody: (d) => (d?.futureTripsKept ? `${d.futureTripsKept} upcoming trip${d.futureTripsKept === 1 ? "" : "s"} made from it stay on sale: cancel them on the Trips page if they should not run.` : "Schedule deleted."),
                  })}
                />
              </div>
            ),
          },
        ]}
      />
      {form}
      {delNode}
    </Page>
  );
}
