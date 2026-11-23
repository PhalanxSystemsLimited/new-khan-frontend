/**
 * "Where does the bus go?" in New schedule and One-off trip: a saved route from the list, or locations chosen one
 * by one (from, any via stops, to) with the travel time of each leg. The server reuses a saved route with the same
 * stops in the same order, or creates a new one (backend: modules/routes/customRoute.js).
 *
 *   const builder = useRouteBuilder();                 // terminals + every saved route's stops
 *   const [choice, setChoice] = useState(emptyRouteChoice());
 *   const picked = describeRoute(choice, builder, routes);   // { problem, body, route, ... }
 *   <RoutePicker choice={choice} onChange={setChoice} builder={builder} routes={routes} showProblems={tried} />
 */
import { adminApi } from "../api";
import { Btn, Input, Label, Select, useLoad } from "../ui";

export const emptyRouteChoice = () => ({ mode: "saved", routeId: "", stops: ["", ""], typed: {} });

/** Active terminals and every route's stops, loaded fresh each time (a terminal added under Locations shows up). */
export function useRouteBuilder() {
  const load = useLoad(() => Promise.all([adminApi.locations(), adminApi.routeBuilder()]), [], { fresh: true });
  const [locs, saved] = load.data ?? [null, []];
  return {
    terminals: (locs?.terminals ?? []).filter((t) => t.isActive),
    saved: saved ?? [],
    loading: load.loading,
    err: load.err,
    reload: load.reload,
  };
}

const hm = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`);

/** Travel times the saved routes already have, per leg "fromTerminalId-toTerminalId" (routes in use first). */
function knownLegs(saved) {
  const known = {};
  for (const r of saved) {
    for (let i = 0; i + 1 < r.stops.length; i++) {
      const key = `${r.stops[i].terminalId}-${r.stops[i + 1].terminalId}`;
      const minutes = r.stops[i + 1].minutes - r.stops[i].minutes;
      if (!(key in known) && minutes > 0) known[key] = minutes;
    }
  }
  return known;
}

/**
 * Everything the form needs to know about the choice:
 *   problem  what is missing or wrong, in plain words (null = fine)
 *   body     what to send: { routeId } or { customRoute: { terminalIds, legMinutes } }
 *   route    { id, name, estDurationMinutes, originCityId, originCity, destinationCityId, destinationCity } or null
 *   legs     the legs of chosen locations: [{ key, fromCity, toCity, minutes, known, locked }]
 *   match    the saved route with exactly the chosen stops, if any
 */
export function describeRoute(choice, builder, routes) {
  if (choice.mode === "saved") {
    const route = routes.find((r) => String(r.id) === String(choice.routeId)) ?? null;
    return { problem: route ? null : "Choose a route.", body: route ? { routeId: route.id } : null, route, legs: [], match: null };
  }

  const termById = new Map(builder.terminals.map((t) => [String(t.id), t]));
  const ids = choice.stops.map(String);
  const terms = ids.map((id) => termById.get(id) ?? null);
  const allChosen = terms.every(Boolean);
  const repeated = new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length;
  const match = allChosen && !repeated
    ? builder.saved.find((r) => r.stops.length === ids.length && r.stops.every((s, i) => String(s.terminalId) === ids[i])) ?? null
    : null;

  const known = knownLegs(builder.saved);
  const legs = [];
  for (let i = 0; i + 1 < ids.length; i++) {
    const key = `${ids[i]}-${ids[i + 1]}`;
    const ready = Boolean(terms[i] && terms[i + 1]);
    const fromSaved = match ? match.stops[i + 1].minutes - match.stops[i].minutes : null;
    legs.push({
      key,
      ready,
      fromCity: terms[i]?.cityName ?? "",
      toCity: terms[i + 1]?.cityName ?? "",
      minutes: match ? String(fromSaved) : ready ? String(choice.typed[key] ?? known[key] ?? "") : "",
      known: !match && ready && choice.typed[key] === undefined && key in known,
      locked: Boolean(match),
    });
  }
  const legMinutes = legs.map((l) => Number(l.minutes));
  const legsOk = legs.every((l) => /^\d+$/.test(l.minutes) && Number(l.minutes) >= 1 && Number(l.minutes) <= 3000);

  let problem = null;
  if (!allChosen) problem = ids.length > 2 ? "Choose a terminal for every stop, or remove the empty stop." : "Choose where the bus starts and where it ends.";
  else if (repeated) problem = "A terminal can be chosen only once.";
  else if (match && !match.isActive) problem = `This is the saved route "${match.name}", which is switched off. Switch it on under Routes & stops, then choose it from Saved route.`;
  else if (!legsOk) problem = "Enter the travel time of every leg in minutes (1 to 3000).";

  const first = terms[0];
  const last = terms[terms.length - 1];
  const via = terms.slice(1, -1).filter(Boolean).map((t) => t.cityName);
  const total = legsOk ? legMinutes.reduce((s, m) => s + m, 0) : null;
  const route = !problem
    ? {
        id: match?.id ?? null,
        name: match?.name ?? `${first.cityName} → ${last.cityName}${via.length ? ` (via ${via.join(", ")})` : ""}`,
        estDurationMinutes: total,
        originCityId: first.cityId,
        originCity: first.cityName,
        destinationCityId: last.cityId,
        destinationCity: last.cityName,
      }
    : null;
  const body = problem ? null : match ? { routeId: match.id } : { customRoute: { terminalIds: ids.map(Number), legMinutes } };
  return { problem, body, route, legs, match, total };
}

export default function RoutePicker({ choice, onChange, builder, routes, showProblems = false, serverError = null }) {
  const picked = describeRoute(choice, builder, routes);
  const set = (patch) => onChange({ ...choice, ...patch });
  const setStop = (i, v) => set({ stops: choice.stops.map((s, j) => (j === i ? v : s)) });
  const move = (i, d) => {
    const stops = [...choice.stops];
    [stops[i], stops[i + d]] = [stops[i + d], stops[i]];
    set({ stops });
  };
  const termOpts = [{ value: "", label: "— choose terminal —" }, ...builder.terminals.map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))];
  const routeOpts = [{ value: "", label: "— choose —" }, ...routes.filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name }))];
  const last = choice.stops.length - 1;
  const tab = (mode, label) => (
    <button
      type="button"
      onClick={() => set({ mode })}
      aria-pressed={choice.mode === mode}
      className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${choice.mode === mode ? "border-black bg-black text-white" : "border-neutral-400 bg-white text-neutral-700"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <Label>Route *</Label>
      <div className="mb-2 flex flex-wrap gap-2">
        {tab("saved", "Saved route")}
        {tab("custom", "Choose locations")}
      </div>

      {choice.mode === "saved" ? (
        <Select id="f-routeId" aria-label="Saved route" value={choice.routeId} onChange={(e) => set({ routeId: e.target.value })} options={routeOpts} />
      ) : (
        <div className="grid gap-2 rounded-xl border border-neutral-300 p-3">
          {builder.err && <p role="alert" className="text-sm text-red-700">Could not load the terminals: {builder.err}</p>}
          {choice.stops.map((s, i) => (
            <div key={i} className="grid gap-2">
              <div>
                <Label htmlFor={`f-stop-${i}`}>{i === 0 ? "From *" : i === last ? "To *" : `Via ${i}`}</Label>
                <div className="flex gap-1">
                  <Select id={`f-stop-${i}`} value={s} onChange={(e) => setStop(i, e.target.value)} options={termOpts} />
                  {i > 0 && i < last && (
                    <>
                      <Btn small disabled={i === 1} onClick={() => move(i, -1)} aria-label="Move this stop earlier">↑</Btn>
                      <Btn small disabled={i === last - 1} onClick={() => move(i, 1)} aria-label="Move this stop later">↓</Btn>
                      <Btn small kind="danger" onClick={() => set({ stops: choice.stops.filter((_, j) => j !== i) })} aria-label="Remove this stop">✕</Btn>
                    </>
                  )}
                </div>
              </div>
              {i < last && (
                <div className="ms-3 flex flex-wrap items-center gap-2 border-s-4 border-neutral-300 ps-3 text-sm">
                  <label htmlFor={`f-leg-${i}`} className="text-neutral-700">
                    Travel time{picked.legs[i]?.ready ? ` ${picked.legs[i].fromCity} → ${picked.legs[i].toCity}` : ""}
                  </label>
                  <Input
                    id={`f-leg-${i}`}
                    type="number"
                    min={1}
                    max={3000}
                    className="!w-24"
                    disabled={!picked.legs[i]?.ready || picked.legs[i]?.locked}
                    value={picked.legs[i]?.minutes ?? ""}
                    onChange={(e) => set({ typed: { ...choice.typed, [picked.legs[i].key]: e.target.value } })}
                  />
                  <span className="text-neutral-700">minutes</span>
                  {picked.legs[i]?.known && <span className="text-xs text-mute">(from a saved route; change it if needed)</span>}
                </div>
              )}
            </div>
          ))}
          <div>
            <Btn small onClick={() => set({ stops: [...choice.stops.slice(0, -1), "", choice.stops[last]] })}>+ Add a via stop</Btn>
          </div>
          {picked.match?.isActive && (
            <p className="rounded-lg bg-neutral-100 p-2 text-sm text-neutral-800">
              This is the saved route <b>{picked.match.name}</b>. It will be used, with its own travel times.
            </p>
          )}
          {!picked.problem && !picked.match && (
            <p className="rounded-lg bg-neutral-100 p-2 text-sm text-neutral-800">
              New route <b>{picked.route.name}</b>, {hm(picked.total)} in all. It is saved under Routes & stops. Set its fares on the Fares page before it can be booked.
            </p>
          )}
        </div>
      )}
      {(serverError || (showProblems && picked.problem)) && (
        <p role="alert" className="mt-1 text-sm text-red-700">{serverError || picked.problem}</p>
      )}
    </div>
  );
}
