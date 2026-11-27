/**
 * Route form laid out like the route-alignment sheet: each stop with its travel time to the next stop and its stay,
 * and the arrival / departure clock times worked out for a bus leaving at a chosen time.
 *
 * Stored per stop (route_stops): minutesFromOrigin = when the bus LEAVES the stop, stayMinutes = how long it waits
 * there (it arrives stayMinutes earlier). Staff never type minutes from the first stop: they are added up here.
 */
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api";
import { toast } from "../../components/Toast";
import { act, Btn, Input, Label, Modal, pkDate, Select, useConfirm, useLoad } from "../ui";

const BUS_CLASSES = ["economy", "executive", "business", "sleeper"].map((c) => ({ value: c, label: c }));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_STAY = "0:10";

/* ------------------------------------------------------------------ times */

/** "2:15" (or "2.15") → 135 minutes. Blank → null. Anything else → NaN. */
export function parseDur(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m || Number(m[2]) > 59) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}
/** 135 → "2:15". */
export const fmtDur = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
/** "06:30" → 390. */
const parseClock = (v) => {
  const m = String(v ?? "").match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
/** Clock time of a bus leaving at `start` (minutes after midnight), `m` minutes later: "8:45", "1:10 +1 day". */
export function clockAt(start, m) {
  const t = start + m;
  const day = Math.floor(t / 1440);
  const in_ = t % 1440;
  return `${Math.floor(in_ / 60)}:${String(in_ % 60).padStart(2, "0")}${day > 0 ? ` +${day} day` : ""}`;
}

let nextKey = 1;
const blankRow = (o = {}) => ({ key: nextKey++, terminalId: "", travel: "", stay: "", km: "", boards: true, drops: true, ...o });

/** Saved stops → form rows (travel time to the next stop and stay, as the sheet has them). */
function rowsFromStops(stops) {
  return stops.map((s, i) => {
    const next = stops[i + 1];
    const stay = Number(s.stayMinutes ?? 0);
    return blankRow({
      terminalId: s.terminalId,
      travel: next ? fmtDur(next.minutesFromOrigin - Number(next.stayMinutes ?? 0) - s.minutesFromOrigin) : "",
      stay: i > 0 && i < stops.length - 1 ? fmtDur(stay) : "",
      km: Number(s.kmFromOrigin ?? 0) ? String(Number(s.kmFromOrigin)) : "",
      boards: s.isBoardingPoint,
      drops: s.isDroppingPoint,
    });
  });
}

/**
 * Adds the rows up. For each row: arrive / leave (minutes from the first stop, null when unknown) and the problem
 * with its travel or stay box. `stops` is the body the server takes, when nothing is wrong.
 */
export function workOut(rows) {
  const last = rows.length - 1;
  const out = [];
  const problems = [];
  let leftPrev = 0; // when the bus left the stop before (null once a travel time is missing)
  rows.forEach((r, i) => {
    const o = { arrive: null, leave: null, travelErr: "", stayErr: "" };
    if (i === 0) o.leave = 0;
    else {
      const travel = parseDur(rows[i - 1].travel);
      o.arrive = leftPrev === null || !(travel > 0) ? null : leftPrev + travel;
      const stay = i === last ? 0 : parseDur(r.stay);
      if (i < last && Number.isNaN(stay)) o.stayErr = "Write it as h:mm, e.g. 0:10";
      o.leave = o.arrive === null || Number.isNaN(stay) ? null : o.arrive + (stay ?? 0);
    }
    if (i < last) {
      const travel = parseDur(r.travel);
      if (travel === null) o.travelErr = "Needed";
      else if (Number.isNaN(travel)) o.travelErr = "Write it as h:mm, e.g. 2:15";
      else if (travel <= 0) o.travelErr = "Must be more than 0:00";
    }
    leftPrev = o.leave;
    out.push(o);
  });
  if (rows.some((r) => !r.terminalId)) problems.push("Choose a terminal for every stop.");
  const ids = rows.map((r) => String(r.terminalId)).filter(Boolean);
  if (new Set(ids).size !== ids.length) problems.push("A terminal can be on the route only once.");
  if (out.some((o) => o.travelErr)) problems.push("Fill in every travel time (h:mm, more than 0:00).");
  if (out.some((o) => o.stayErr)) problems.push("Write stay times as h:mm, e.g. 0:10 (blank = no stay).");
  if (rows.some((r) => r.km !== "" && !(Number(r.km) >= 0))) problems.push("Km must be a number.");
  const stops = problems.length
    ? null
    : rows.map((r, i) => ({
        terminalId: Number(r.terminalId),
        minutesFromOrigin: i === last ? out[i].arrive : out[i].leave,
        stayMinutes: i === 0 || i === last ? 0 : parseDur(r.stay) ?? 0,
        kmFromOrigin: Number(r.km) || 0,
        isBoardingPoint: r.boards,
        isDroppingPoint: r.drops,
      }));
  return { out, problems, stops, total: out[last]?.arrive ?? null };
}

const hm = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
const abbr = (city = "") => {
  const words = city.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");
};

/* ------------------------------------------------------------------ the form */

/**
 * New route (isNew) or a saved route's stops and times (route). terminals: active terminals with cityName.
 * schedules: the route's schedules (their times are offered as "leaving at").
 */
export function RouteEditor({ title, route, terminals, schedules = [], onClose, onSaved, isNew }) {
  const [rows, setRows] = useState(() => (route?.stops?.length ? rowsFromStops(route.stops) : [blankRow(), blankRow()]));
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [distance, setDistance] = useState("");
  const times = schedules.map((s) => s.departureTime.slice(0, 5)).sort();
  const [start, setStart] = useState(times[0] ?? "06:00");
  const [more, setMore] = useState(() => Boolean(route?.stops?.some((s) => Number(s.kmFromOrigin) || !s.isBoardingPoint || !s.isDroppingPoint)));
  const [sched, setSched] = useState(null); // "Also create schedules": { times, busClass, defaultBusId, days, from }
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, askNode] = useConfirm();
  const buses = useLoad(() => (isNew ? adminApi.buses() : Promise.resolve([])), [isNew]);

  const byId = useMemo(() => new Map(terminals.map((t) => [String(t.id), t])), [terminals]);
  const opts = [{ value: "", label: "Choose terminal" }, ...terminals.map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))];
  const { out, problems, stops, total } = workOut(rows);
  const startMin = parseClock(start);
  const last = rows.length - 1;

  // New route: the code and name follow the first and last stops until typed over.
  const origin = byId.get(String(rows[0]?.terminalId));
  const dest = byId.get(String(rows[last]?.terminalId));
  useEffect(() => {
    if (!isNew || !origin || !dest) return;
    if (!codeTouched) setCode(`${abbr(origin.cityName)}-${abbr(dest.cityName)}`.slice(0, 20));
    if (!nameTouched) setName(`${origin.cityName} to ${dest.cityName}`);
  }, [isNew, origin, dest, codeTouched, nameTouched]);
  const update = setRows;
  const set = (i, k, v) => update((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i, d) => update((a) => { const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b; });
  const remove = (i) => update((a) => a.filter((_, j) => j !== i));
  // A stop after row i. Added at the end: the stop that was last now needs a travel time and gets a stay.
  const insertAfter = (i) =>
    update((a) => {
      const b = a.map((r, j) => (j === a.length - 1 && i === a.length - 1 && !r.stay && j > 0 ? { ...r, stay: DEFAULT_STAY } : r));
      b.splice(i + 1, 0, blankRow({ stay: i + 1 < a.length ? DEFAULT_STAY : "" }));
      return b;
    });

  const schedProblems = [];
  if (sched) {
    if (!sched.times.length || sched.times.some((t) => !/^\d{2}:\d{2}$/.test(t))) schedProblems.push("Fill in every departure time, or remove it.");
    if (!sched.days.length) schedProblems.push("Choose at least one day the schedules run.");
  }
  const allProblems = [
    ...(isNew && !/^[A-Za-z0-9-]{2,20}$/.test(code.trim()) ? ["Code: 2 to 20 letters, numbers or dashes, e.g. LAH-DIK."] : []),
    ...(isNew && name.trim().length < 3 ? ["Fill in the route name."] : []),
    ...(isNew && distance !== "" && !(Number(distance) > 0) ? ["Distance must be a number of km."] : []),
    ...problems,
    ...schedProblems,
  ];

  async function save() {
    setTried(true);
    if (allProblems.length) return;
    setBusy(true);
    if (isNew) {
      let made = null;
      const ok = await act(async () => {
        made = await adminApi.createRoute({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          ...(distance !== "" ? { distanceKm: Number(distance) } : {}),
          stops,
          ...(sched
            ? {
                schedules: {
                  times: sched.times,
                  busClass: sched.busClass,
                  ...(sched.defaultBusId ? { defaultBusId: Number(sched.defaultBusId) } : {}),
                  daysOfWeek: sched.days,
                  effectiveFrom: sched.from || undefined,
                },
              }
            : {}),
        });
      });
      setBusy(false);
      if (!ok) return;
      const n = made?.schedules?.length ?? 0;
      toast("Route created", {
        body: `${n ? `${n} schedule${n === 1 ? "" : "s"} created (${made.schedules.map((s) => s.departureTime.slice(0, 5)).join(", ")}). ` : ""}Set its fares on the Fares page before selling tickets.`,
        duration: 8000,
      });
      onSaved();
      onClose();
      return;
    }
    // Saved route: the server asks first when fares would be deleted or booked tickets would show new times.
    let declined = false;
    let res = null;
    const ok = await act(async () => {
      let flags = {};
      for (let tries = 0; tries < 3; tries++) {
        try {
          res = await adminApi.replaceStops(route.id, stops, flags);
          return;
        } catch (e) {
          if (e?.code === "FARES_WOULD_BE_DELETED") {
            if (!(await ask("Delete this route's fares?", e.message, { confirm: "Save stops and delete fares" }))) {
              declined = true;
              return;
            }
            flags = { ...flags, deleteFares: true };
          } else if (e?.code === "TIMES_CHANGE_BOOKED") {
            if (!(await ask("Change the times of booked tickets?", e.message, { confirm: "Save the new times", danger: false }))) {
              declined = true;
              return;
            }
            flags = { ...flags, confirmTimesChange: true };
          } else throw e;
        }
      }
    });
    setBusy(false);
    if (!ok || declined) return;
    toast("Stops saved", { body: res?.inPlace ? "The route's fares are kept." : "", duration: 4000 });
    onSaved();
    onClose();
  }

  const cell = "border-b border-neutral-200 px-2 py-1.5 align-middle";
  const errCls = "border-red-600";
  return (
    <Modal size="xl" title={title} onClose={onClose}>
      {isNew ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_9rem]">
          <div>
            <Label htmlFor="r-name">Route name *</Label>
            <Input id="r-name" placeholder="Lahore to Dera Ismail Khan" value={name} onChange={(e) => { setName(e.target.value); setNameTouched(true); }} />
          </div>
          <div>
            <Label htmlFor="r-code">Code *</Label>
            <Input id="r-code" placeholder="LAH-DIK" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeTouched(true); }} />
          </div>
          <div>
            <Label htmlFor="r-km">Distance (one way)</Label>
            <Input id="r-km" type="number" min={1} placeholder="km" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
        </div>
      ) : (
        <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Changing travel times, stays, km or Boards / Drops keeps the fares, and works after tickets are sold (booked tickets show the new times).
          Adding, removing or reordering stops is only possible while the route has no bookings, and deletes its fares.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="r-start">Show times for a bus leaving at</Label>
          <Input id="r-start" type="time" className="w-36" value={start} onChange={(e) => setStart(e.target.value || "00:00")} />
        </div>
        {times.length > 0 && (
          <div className="flex flex-wrap gap-1 pb-1 text-sm">
            <span className="self-center text-mute">This route's schedules:</span>
            {times.map((t) => (
              <Btn key={t} small kind={t === start ? "primary" : "ghost"} onClick={() => setStart(t)}>{t}</Btn>
            ))}
          </div>
        )}
        <label className="ml-auto flex items-center gap-1 pb-2 text-sm">
          <input type="checkbox" className="accent-black" checked={more} onChange={(e) => setMore(e.target.checked)} />
          More (km, Boards / Drops)
        </label>
      </div>
      <p className="mb-2 text-sm text-mute">
        Type each stop's <b>travel time to the next stop</b> and its <b>stay</b> as h:mm (2:15, 0:10). Arrival and departure times are worked out for you.
      </p>

      <div className="overflow-x-auto rounded-xl border-2 border-black">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-neutral-100 text-left text-xs font-bold uppercase tracking-wide text-neutral-700">
            <tr>
              <th className={cell}>#</th>
              <th className={cell}>Stop</th>
              <th className={cell}>Arrival</th>
              <th className={cell}>Departure</th>
              <th className={cell}>Travel time to next</th>
              <th className={cell}>Stay</th>
              {more && <th className={cell}>Km</th>}
              {more && <th className={cell}>Passengers</th>}
              <th className={cell}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const o = out[i];
              return (
                  <tr key={r.key}>
                    <td className={`${cell} text-center font-bold`}>{i}</td>
                    <td className={`${cell} min-w-[14rem]`}>
                      <Select aria-label={`Stop ${i} terminal`} value={r.terminalId} onChange={(e) => set(i, "terminalId", e.target.value)} options={opts}
                        className={tried && !r.terminalId ? errCls : ""} />
                    </td>
                    <td className={`${cell} whitespace-nowrap font-mono`} data-testid={`arr-${i}`}>{i === 0 ? "–" : o.arrive === null ? "?" : clockAt(startMin, o.arrive)}</td>
                    <td className={`${cell} whitespace-nowrap font-mono`} data-testid={`dep-${i}`}>{i === last ? "–" : o.leave === null ? "?" : clockAt(startMin, o.leave)}</td>
                    <td className={cell}>
                      {i < last && (
                        <>
                          <Input aria-label={`Stop ${i} travel time to next`} inputMode="numeric" placeholder="2:15" className={`w-24 ${(tried || r.travel) && o.travelErr ? errCls : ""}`}
                            value={r.travel} onChange={(e) => set(i, "travel", e.target.value)} />
                          {(tried || r.travel) && o.travelErr && <span className="mt-0.5 block text-xs text-red-700">{o.travelErr}</span>}
                        </>
                      )}
                    </td>
                    <td className={cell}>
                      {i > 0 && i < last && (
                        <>
                          <Input aria-label={`Stop ${i} stay`} inputMode="numeric" placeholder="0:10" className={`w-20 ${o.stayErr ? errCls : ""}`}
                            value={r.stay} onChange={(e) => set(i, "stay", e.target.value)} />
                          {o.stayErr && <span className="mt-0.5 block text-xs text-red-700">{o.stayErr}</span>}
                        </>
                      )}
                    </td>
                    {more && (
                      <td className={cell}>
                        <Input aria-label={`Stop ${i} km from first stop`} type="number" min={0} className="w-20" value={r.km} onChange={(e) => set(i, "km", e.target.value)} />
                      </td>
                    )}
                    {more && (
                      <td className={`${cell} whitespace-nowrap`}>
                        <label className="mr-2 inline-flex items-center gap-1"><input type="checkbox" className="accent-black" checked={r.boards} onChange={(e) => set(i, "boards", e.target.checked)} />Boards</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" className="accent-black" checked={r.drops} onChange={(e) => set(i, "drops", e.target.checked)} />Drops</label>
                      </td>
                    )}
                    <td className={`${cell} whitespace-nowrap`}>
                      <div className="flex gap-1">
                        <Btn small disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move stop ${i} up`}>↑</Btn>
                        <Btn small disabled={i === last} onClick={() => move(i, 1)} aria-label={`Move stop ${i} down`}>↓</Btn>
                        <Btn small onClick={() => insertAfter(i)} aria-label={`Add a stop after stop ${i}`} title="Add a stop after this one">+</Btn>
                        <Btn small kind="danger" disabled={rows.length <= 2} onClick={() => remove(i)} aria-label={`Remove stop ${i}`}>✕</Btn>
                      </div>
                    </td>
                  </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Btn onClick={() => insertAfter(last)}>+ Add stop at the end</Btn>
        <span className="text-sm">
          Total journey: <b data-testid="total">{total === null ? "–" : hm(total)}</b>
          {total !== null && <> · arrives {clockAt(startMin, total)}</>}
        </span>
      </div>

      {isNew && (
        <div className="mt-4 rounded-xl border border-neutral-300 p-3">
          <label className="flex items-center gap-2 font-semibold">
            <input id="r-sched" type="checkbox" className="accent-black" checked={Boolean(sched)}
              onChange={(e) => setSched(e.target.checked ? { times: [start], busClass: "executive", defaultBusId: "", days: [1, 2, 3, 4, 5, 6, 7], from: pkDate() } : null)} />
            Also create schedules (the departure times of this route)
          </label>
          {sched && (
            <div className="mt-3 grid gap-3">
              <div>
                <Label>Departure times from the first stop</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {sched.times.map((t, k) => (
                    <span key={k} className="flex items-center gap-1">
                      <Input type="time" aria-label={`Departure time ${k + 1}`} className="w-32" value={t}
                        onChange={(e) => setSched((s) => ({ ...s, times: s.times.map((x, j) => (j === k ? e.target.value : x)) }))} />
                      <Btn small kind="danger" disabled={sched.times.length <= 1} aria-label={`Remove departure time ${k + 1}`}
                        onClick={() => setSched((s) => ({ ...s, times: s.times.filter((_, j) => j !== k) }))}>✕</Btn>
                    </span>
                  ))}
                  <Btn small onClick={() => setSched((s) => ({ ...s, times: [...s.times, ""] }))}>+ Add time</Btn>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="r-class">Bus class</Label>
                  <Select id="r-class" value={sched.busClass} options={BUS_CLASSES} onChange={(e) => setSched((s) => ({ ...s, busClass: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="r-bus">Default bus</Label>
                  <Select id="r-bus" value={sched.defaultBusId} onChange={(e) => setSched((s) => ({ ...s, defaultBusId: e.target.value }))}
                    options={[{ value: "", label: "None yet" }, ...(buses.data ?? []).filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo}${b.fleetNo ? ` (${b.fleetNo})` : ""} · ${b.busClass}` }))]} />
                </div>
                <div>
                  <Label htmlFor="r-from">From date</Label>
                  <Input id="r-from" type="date" value={sched.from} onChange={(e) => setSched((s) => ({ ...s, from: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Runs on</Label>
                <div className="flex flex-wrap gap-3 text-sm">
                  {DAYS.map((d, k) => (
                    <label key={d} className="flex items-center gap-1">
                      <input type="checkbox" className="accent-black" checked={sched.days.includes(k + 1)}
                        onChange={(e) => setSched((s) => ({ ...s, days: e.target.checked ? [...s.days, k + 1].sort() : s.days.filter((x) => x !== k + 1) }))} />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-mute">Each time becomes a schedule. Create its trips afterwards on Schedules &amp; trips → Create trips (a default bus is needed for that).</p>
            </div>
          )}
        </div>
      )}

      {tried && allProblems.length > 0 && (
        <ul role="alert" className="mt-3 list-disc rounded-xl border-2 border-red-600 bg-red-50 p-3 pl-7 text-sm text-red-800">
          {allProblems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn kind="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : isNew ? "Create route" : "Save stops & times"}</Btn>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
      {askNode}
    </Modal>
  );
}

/* ------------------------------------------------------------------ timetable */

/** Read-only timetable of a saved route, like the sheet, for each of its schedules' departure times. */
export function RouteTimetable({ route, schedules = [], onClose }) {
  const times = [...new Set(schedules.map((s) => s.departureTime.slice(0, 5)))].sort();
  const [start, setStart] = useState(times[0] ?? "06:00");
  const startMin = parseClock(start);
  const stops = route.stops ?? [];
  const last = stops.length - 1;
  const cell = "border-b border-neutral-200 px-3 py-1.5";
  return (
    <Modal wide title={`Timetable · ${route.name}`} onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <span>Distance (one way): <b>{route.distanceKm ? `${Number(route.distanceKm)} km` : "–"}</b></span>
        <span>Journey: <b>{last > 0 ? hm(stops[last].minutesFromOrigin) : "–"}</b></span>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {times.map((t) => (
            <Btn key={t} small kind={t === start ? "primary" : "ghost"} onClick={() => setStart(t)}>{t}</Btn>
          ))}
          <div>
            <Label htmlFor="tt-start">Leaving at</Label>
            <Input id="tt-start" type="time" className="w-32" value={start} onChange={(e) => setStart(e.target.value || "00:00")} />
          </div>
        </div>
      </div>
      {!times.length && <p className="mb-2 text-sm text-mute">This route has no schedules yet: showing a bus leaving at the time above.</p>}
      <div className="overflow-x-auto rounded-xl border-2 border-black">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-neutral-100 text-left text-xs font-bold uppercase tracking-wide text-neutral-700">
            <tr>
              <th className={cell}>#</th><th className={cell}>Stop</th><th className={cell}>Arrival</th><th className={cell}>Departure</th>
              <th className={cell}>Travel time to next</th><th className={cell}>Stay</th>
            </tr>
          </thead>
          <tbody>
            {stops.map((s, i) => {
              const stay = Number(s.stayMinutes ?? 0);
              const next = stops[i + 1];
              return (
                <tr key={s.id ?? i}>
                  <td className={`${cell} font-bold`}>{i}</td>
                  <td className={cell}>{s.cityName} <span className="text-mute">· {s.terminalName}</span></td>
                  <td className={`${cell} font-mono`}>{i === 0 ? "–" : clockAt(startMin, s.minutesFromOrigin - stay)}</td>
                  <td className={`${cell} font-mono`}>{i === last ? "–" : clockAt(startMin, s.minutesFromOrigin)}</td>
                  <td className={`${cell} font-mono`}>{next ? fmtDur(next.minutesFromOrigin - Number(next.stayMinutes ?? 0) - s.minutesFromOrigin) : "–"}</td>
                  <td className={`${cell} font-mono`}>{i > 0 && i < last ? fmtDur(stay) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
