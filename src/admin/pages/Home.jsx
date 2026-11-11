/**
 * Home screens for each role:
 *   CounterScreen  /admin/counter        counter officer: today's buses at their terminal, quick sale, voucher, arrived
 *   TicketPrint    /admin/ticket/:id     printed ticket (80 / 58 mm) after a counter sale
 *   MyTrips        /admin/my-trips       driver / conductor: their own trips
 *   Board          /admin/board          manager: the whole day at a glance, refreshing every minute
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, Input, Label, Modal, Page, pkDate, Section, Select, StatusBadge, Table, useLoad } from "../ui";

const TZ = "Asia/Karachi";
const time = (v) => (v ? new Date(v).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase() : "–");
const dayName = (v) => new Date(v).toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const dayKey = (v) => new Date(v).toLocaleDateString("en-CA", { timeZone: TZ });
const money = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");

/** Reloads every `ms` while the page is open. */
function useEvery(fn, ms) {
  useEffect(() => {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }, [fn, ms]);
}

/* ------------------------------------------------------------------ counter officer */

export function CounterScreen({ me }) {
  const [date, setDate] = useState(pkDate());
  const locs = useLoad(() => (me.role === "agent" ? Promise.resolve(null) : adminApi.locations()), [me.role]);
  const [terminalId, setTerminalId] = useState(me.terminalId ?? "");
  const deps = useLoad(
    () => (me.role === "agent" || terminalId ? adminApi.counterDepartures(date, me.role === "agent" ? undefined : terminalId) : Promise.resolve(null)),
    [date, terminalId],
  );
  useEvery(deps.reload, 60_000);
  const [selling, setSelling] = useState(null);
  const d = deps.data;

  const arrived = async (t) => {
    let res;
    const ok = await act(async () => { res = await adminApi.tripStatus(t.tripId, { status: "arrived" }); }, "Bus arrived");
    if (ok && res?.autoReport?.roundTripId) act(async () => {}, `Round trip report ${res.autoReport.roundTripId} created`, "An admin completes it.");
    if (ok) deps.reload();
  };

  return (
    <Page
      title={d ? `Counter · ${d.terminal.city}` : "Counter"}
      intro="Today's buses at your terminal. Sell tickets until the voucher is generated, then print the voucher for the conductor. Mark buses that end here as arrived."
    >
      <Filters>
        {me.role !== "agent" && (
          <div>
            <Label htmlFor="ct-t">Terminal</Label>
            <Select id="ct-t" value={terminalId} onChange={(e) => setTerminalId(e.target.value)}
              options={[{ value: "", label: "— choose —" }, ...(locs.data?.terminals ?? []).filter((t) => t.isActive).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))]} />
          </div>
        )}
        <div>
          <Label htmlFor="ct-d">Date</Label>
          <Input id="ct-d" type="date" value={date} onChange={(e) => setDate(e.target.value || pkDate())} />
        </div>
        <Btn onClick={() => setDate(pkDate())}>Today</Btn>
        <Btn onClick={() => setDate(pkDate(1))}>Tomorrow</Btn>
        <Btn onClick={deps.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={deps.err} onRetry={deps.reload} />
      {me.role !== "agent" && !terminalId && <p className="text-sm text-mute">Choose a terminal.</p>}
      {d && d.departures.length === 0 && <p className="rounded-xl border border-dashed border-neutral-400 p-4 text-sm text-mute">No buses at {d.terminal.city} on this day.</p>}
      <div className="grid gap-3">
        {d?.departures.map((t) => (
          <div key={`${t.tripId}-${t.stopId}`} className={`rounded-2xl border-2 bg-white p-4 ${t.canSell ? "border-black" : "border-neutral-300"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold">
                  {time(t.hereAt)} {t.delayMinutes > 0 && <Badge tone="amber">+{t.delayMinutes} min</Badge>}
                </p>
                <p className="font-bold">{t.routeName}</p>
                <p className="text-sm text-mute">
                  Bus {t.busNo}{t.fleetNo ? ` (${t.fleetNo})` : ""} · driver {t.driverName ?? "–"} · conductor {t.conductorName ?? <span className="font-bold text-red-700">not assigned</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <StatusBadge s={t.status} />
                  {t.lastLeft && <Badge tone="blue">on route · left {t.lastLeft} {time(t.lastLeftAt)}</Badge>}
                  {t.voucher ? <Badge tone="green">voucher {t.voucher.voucherNo} · booking closed</Badge> : t.boardsHere ? <Badge tone="amber">booking open here</Badge> : null}
                  {t.endsHere && <Badge>ends here</Badge>}
                </div>
              </div>
              <div className="text-end">
                {t.boardsHere && <p className="text-3xl font-extrabold">{t.seatsLeft}<span className="text-base font-semibold text-mute"> / {t.seats} seats left</span></p>}
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  {t.canSell && <Btn kind="primary" disabled={t.seatsLeft === 0} onClick={() => setSelling(t)}>Sell ticket</Btn>}
                  {t.boardsHere && <Link className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm" to={`/admin/trip-vouchers/${t.tripId}`}>{t.voucher ? "Voucher & passengers" : "Generate voucher"}</Link>}
                  {t.endsHere && t.status === "departed" && <Btn kind="ok" onClick={() => arrived(t)}>Arrived</Btn>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selling && <QuickSale trip={selling} onClose={() => setSelling(null)} onSold={() => { setSelling(null); deps.reload(); }} />}
    </Page>
  );
}

/** Quick counter sale: choose seats and destination, type the passengers, take the cash, print. */
function QuickSale({ trip, onClose, onSold }) {
  const seats = useLoad(() => adminApi.tripSeats(trip.tripId), [trip.tripId]);
  const [picked, setPicked] = useState([]); // seat ids in click order
  const [dest, setDest] = useState(trip.destinations.at(-1)?.stopId ?? "");
  const [contact, setContact] = useState({ name: "", phone: "", cnic: "" });
  const [pax, setPax] = useState({}); // seatId -> { name, gender }
  const [busy, setBusy] = useState(false);
  const [sold, setSold] = useState(null);
  const fare = trip.destinations.find((x) => String(x.stopId) === String(dest))?.fare ?? 0;

  const grid = useMemo(() => {
    const list = seats.data ?? [];
    const rows = [...new Set(list.map((s) => s.rowNo))].sort((a, b) => a - b);
    const maxCol = Math.max(0, ...list.map((s) => s.colNo));
    return { list, rows, maxCol, aisle: maxCol === 4 ? 2 : maxCol === 3 ? 1 : maxCol >= 5 ? Math.floor(maxCol / 2) : 0 };
  }, [seats.data]);

  const toggle = (s) => {
    if (s.status !== "available") return;
    setPicked((p) => (p.includes(s.seatId) ? p.filter((x) => x !== s.seatId) : [...p, s.seatId]));
    setPax((p) => ({ ...p, [s.seatId]: p[s.seatId] ?? { name: "", gender: "male" } }));
  };

  async function sell(e) {
    e.preventDefault();
    if (!picked.length) return act(() => Promise.reject(new Error("Choose at least one seat.")));
    setBusy(true);
    let booking;
    const ok = await act(async () => {
      booking = await adminApi.createCounterBooking({
        tripId: trip.tripId,
        boardingStopId: trip.stopId,
        droppingStopId: Number(dest),
        contact: { name: contact.name.trim(), phone: contact.phone.trim() },
        ...(contact.cnic.trim() ? { holderCnic: contact.cnic.trim() } : {}),
        channel: "counter",
        passengers: picked.map((id, i) => ({ seatId: id, name: (pax[id]?.name || (i === 0 ? contact.name : "")).trim(), gender: pax[id]?.gender ?? "male", phone: contact.phone.trim() })),
      });
      try {
        await adminApi.cashPayment(booking.id, booking.totalAmount);
      } catch (err) {
        // The cash was not recorded: cancel the hold so the seats free up again.
        await adminApi.cancelBooking(booking.id, "Counter sale not completed").catch(() => {});
        throw err;
      }
    }, "Ticket sold", "Cash recorded.");
    setBusy(false);
    if (ok) setSold(booking);
  }

  if (sold)
    return (
      <Modal title="Ticket sold" onClose={onSold}>
        <p className="text-lg">
          Booking <b className="font-mono">{sold.pnr}</b> · {picked.length} seat{picked.length === 1 ? "" : "s"} · <b>Rs {money(sold.totalAmount)}</b> cash
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm" href={`/admin/ticket/${sold.id}`} target="_blank" rel="noreferrer">Print ticket</a>
          <Btn onClick={onSold}>Done</Btn>
        </div>
      </Modal>
    );

  const seatOf = (id) => grid.list.find((s) => s.seatId === id);
  return (
    <Modal title={`Sell ticket · ${time(trip.hereAt)} ${trip.routeName}`} onClose={onClose} wide>
      <form onSubmit={sell} className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div>
          <p className="mb-2 text-sm font-bold">Choose seats</p>
          <ErrorNote err={seats.err} onRetry={seats.reload} />
          <p className="mb-2 text-center text-xs font-bold tracking-widest text-neutral-500">▲ FRONT</p>
          <div className="mx-auto grid w-fit gap-1.5">
            {grid.rows.map((r) => (
              <div key={r} className="flex gap-1.5">
                {Array.from({ length: grid.maxCol }, (_, i) => i + 1).map((c) => {
                  const s = grid.list.find((x) => x.rowNo === r && x.colNo === c);
                  const gap = grid.aisle && c === grid.aisle + 1 ? <span key={`g${c}`} className="w-3" aria-hidden /> : null;
                  if (!s) return [gap, <span key={c} className="h-11 w-11" aria-hidden />];
                  const on = picked.includes(s.seatId);
                  const cls = on
                    ? "border-black bg-black text-white"
                    : s.status === "available"
                      ? "border-black bg-white"
                      : s.occupantGender === "female" ? "border-pink-300 bg-pink-100 text-pink-800" : s.occupantGender === "male" ? "border-sky-300 bg-sky-100 text-sky-800" : "border-neutral-300 bg-neutral-200 text-neutral-400";
                  return [
                    gap,
                    <button key={c} type="button" disabled={s.status !== "available"} onClick={() => toggle(s)} aria-pressed={on}
                      aria-label={`Seat ${s.seatNumber}${s.status !== "available" ? " (taken)" : ""}`}
                      className={`h-11 w-11 rounded-lg border-2 text-xs font-bold ${cls}`}>{s.seatNumber}</button>,
                  ];
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">Pink / blue = taken by a woman / man. The system refuses a man and a woman from different bookings side by side.</p>
        </div>
        <div className="grid content-start gap-3">
          <div>
            <Label htmlFor="qs-to">Going to *</Label>
            <Select id="qs-to" required value={dest} onChange={(e) => setDest(e.target.value)} options={trip.destinations.map((x) => ({ value: x.stopId, label: `${x.city} · Rs ${money(x.fare)}` }))} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="qs-n">Customer name *</Label>
              <Input id="qs-n" required minLength={2} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="qs-p">Mobile number *</Label>
              <Input id="qs-p" required inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="03001234567" />
            </div>
            <div>
              <Label htmlFor="qs-c">CNIC (optional)</Label>
              <Input id="qs-c" inputMode="numeric" value={contact.cnic} onChange={(e) => setContact({ ...contact, cnic: e.target.value })} placeholder="35202-1234567-1" />
            </div>
          </div>
          {picked.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm font-bold">Passengers</p>
              {picked.map((id, i) => (
                <div key={id} className="flex flex-wrap items-end gap-2">
                  <b className="w-10">{seatOf(id)?.seatNumber}</b>
                  <Input aria-label="Passenger name" className="!w-auto grow" required={i > 0} minLength={2} placeholder={i === 0 ? `${contact.name || "Customer"} (same as customer)` : "Name"}
                    value={pax[id]?.name ?? ""} onChange={(e) => setPax({ ...pax, [id]: { ...pax[id], name: e.target.value } })} />
                  <Select aria-label="Gender" className="!w-auto" value={pax[id]?.gender ?? "male"} onChange={(e) => setPax({ ...pax, [id]: { ...pax[id], gender: e.target.value } })}
                    options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                </div>
              ))}
            </div>
          )}
          <p className="rounded-xl bg-neutral-100 p-3 text-lg">
            {picked.length} × Rs {money(fare)} = <b>Rs {money(picked.length * fare)}</b> <span className="text-sm text-mute">cash</span>
          </p>
          <div className="flex gap-2">
            <Btn kind="primary" type="submit" disabled={busy || !picked.length}>{busy ? "Selling…" : "Cash received · sell"}</Btn>
            <Btn onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function TicketPrint() {
  const { id } = useParams();
  const b = useLoad(() => adminApi.booking(id), [id]);
  const [width, setWidth] = useState(80);
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `@page { size: ${width}mm auto; margin: 3mm; } @media print { body { background: #fff !important; } .slip-tools { display: none !important; } }`;
    document.head.appendChild(s);
    return () => s.remove();
  }, [width]);
  if (b.err) return <div className="p-6"><ErrorNote err={b.err} onRetry={b.reload} /></div>;
  const x = b.data;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const row = (l, v, bold) => <div className="flex justify-between gap-2"><span>{l}</span><span className={bold ? "font-bold" : ""}>{v}</span></div>;
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const paid = (x.payments ?? []).filter((p) => p.status === "succeeded").reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        <Select aria-label="Paper width" className="!w-auto" value={width} onChange={(e) => setWidth(Number(e.target.value))} options={[{ value: 80, label: "80 mm paper" }, { value: 58, label: "58 mm paper" }]} />
        <Btn kind="primary" onClick={() => window.print()}>Print ticket</Btn>
      </div>
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={{ width: `${width - 6}mm`, fontSize: width === 58 ? "8.5pt" : "10pt", lineHeight: 1.35 }}>
        <div className="text-center">
          <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
          <div className="font-bold">Bus ticket</div>
          <div className="my-1 text-[1.4em] font-bold tracking-wider">{x.pnr}</div>
        </div>
        {dash}
        <div>{x.routeName}</div>
        {row("From", x.boardingTerminal)}
        {row("Departs", `${new Date(x.boardingAt).toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" })} ${time(x.boardingAt)}`, true)}
        {row("To", x.droppingTerminal)}
        {row("Arrives", time(x.droppingAt))}
        {dash}
        {(x.tickets ?? []).map((t) => (
          <div key={t.id}>{row(`Seat ${t.seatNumber}`, `${t.passengerName} (${t.passengerGender === "female" ? "F" : "M"})`)}</div>
        ))}
        {dash}
        {row("Total", `Rs ${money(x.totalAmount)}`, true)}
        {row("Paid", `Rs ${money(paid)} cash`)}
        {row("Status", x.status)}
        {dash}
        <div className="text-center text-[0.9em]">Please be at the terminal 30 minutes before departure. Keep this ticket for the journey.</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ driver / conductor */

export function MyTrips() {
  const trips = useLoad(() => adminApi.myTrips(), []);
  useEvery(trips.reload, 5 * 60_000);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of trips.data ?? []) m.set(dayKey(t.departureAt), [...(m.get(dayKey(t.departureAt)) ?? []), t]);
    return [...m.entries()];
  }, [trips.data]);
  const todayKey = pkDate();
  return (
    <Page title="My trips" intro="The trips you are assigned to, from two days ago to a week ahead. Ask the terminal manager about any change.">
      <ErrorNote err={trips.err} onRetry={trips.reload} />
      {trips.data && trips.data.length === 0 && <p className="rounded-xl border border-dashed border-neutral-400 p-4 text-sm text-mute">You have no trips in these days.</p>}
      {byDay.map(([day, list]) => (
        <Section key={day} title={<>{dayName(list[0].departureAt)} {day === todayKey && <Badge tone="green">today</Badge>}</>}>
          <div className="grid gap-3">
            {list.map((t) => (
              <div key={t.id} className="rounded-xl border border-neutral-300 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xl font-extrabold">{time(t.stops[0]?.at ?? t.departureAt)} {t.delayMinutes > 0 && <Badge tone="amber">+{t.delayMinutes} min</Badge>}</p>
                  <StatusBadge s={t.status} />
                </div>
                <p className="font-bold">{t.routeName}</p>
                <p className="text-sm">{t.stops.map((s) => `${s.city} ${time(s.at)}`).join(" → ")}</p>
                <p className="mt-1 text-sm text-mute">
                  Bus <b className="text-black">{t.busNo}</b>{t.fleetNo ? ` (${t.fleetNo})` : ""} · you are the <b className="text-black">{t.myRole}</b>
                  {t.myRole === "driver" ? ` · conductor ${t.conductorName ?? "–"}${t.conductorPhone ? ` ${t.conductorPhone}` : ""}` : ` · driver ${t.driverName ?? "–"}${t.driverPhone ? ` ${t.driverPhone}` : ""}`}
                  {t.hostessName ? ` · hostess ${t.hostessName}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </Page>
  );
}

/* ------------------------------------------------------------------ manager board */

export function Board({ isAdmin }) {
  const [date, setDate] = useState(pkDate());
  const b = useLoad(() => adminApi.board(date), [date]);
  useEvery(b.reload, 60_000);
  const d = b.data;
  const c = d?.counts;
  const Stat = ({ label, value, tone }) => (
    <div className={`rounded-2xl border-2 bg-white p-3 ${tone === "red" && value > 0 ? "border-red-600" : "border-black"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone === "red" && value > 0 ? "text-red-700" : ""}`}>{value ?? "…"}</p>
    </div>
  );
  return (
    <Page title="Operations board" intro="Every bus of the day across all terminals. Refreshes every minute.">
      <Filters>
        <div>
          <Label htmlFor="bd-d">Date</Label>
          <Input id="bd-d" type="date" value={date} onChange={(e) => setDate(e.target.value || pkDate())} />
        </div>
        <Btn onClick={() => setDate(pkDate())}>Today</Btn>
        <Btn onClick={() => setDate(pkDate(1))}>Tomorrow</Btn>
        <Btn onClick={b.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={b.err} onRetry={b.reload} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Trips" value={c?.trips} />
        <Stat label="Scheduled" value={c?.scheduled} />
        <Stat label="Boarding" value={c?.boarding} />
        <Stat label="On route" value={c?.departed} />
        <Stat label="Arrived" value={c?.arrived} />
        <Stat label="Delayed" value={c?.delayed} tone="red" />
        <Stat label="Missing crew" value={c?.missingCrew} tone="red" />
        <Stat label="Seats sold" value={c?.seatsSold} />
      </div>
      {d && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {d.dayPlan ? <Badge tone="green">Day plan published v{d.dayPlan.version} by {d.dayPlan.publishedByName}</Badge> : <Link to="/admin/day-plan"><Badge tone="amber">Day plan not published</Badge></Link>}
          {d.draftReports.n > 0 && isAdmin && <Link to="/admin/round-trips"><Badge tone="blue">{d.draftReports.n} round trip report{d.draftReports.n === 1 ? "" : "s"} to complete</Badge></Link>}
          {c?.cancelled > 0 && <Badge>{c.cancelled} cancelled</Badge>}
        </div>
      )}
      <Section title="Buses">
        <Table
          loading={b.loading}
          rows={d?.trips}
          empty="No trips on this day."
          cols={[
            { key: "t", label: "Departs", render: (t) => <><b>{time(t.departureAt)}</b>{t.delayMinutes > 0 && <div><Badge tone="amber">+{t.delayMinutes} min</Badge></div>}</> },
            { key: "route", label: "Route", render: (t) => <>{t.routeName}<div className="text-xs text-mute">from {t.fromCity} · bus {t.busNo}</div></> },
            {
              key: "crew",
              label: "Crew",
              render: (t) => (
                <>
                  {t.driverName ? <div>{t.driverName}{t.driverLicenceExpired && <Badge tone="red">licence expired</Badge>}</div> : <Badge tone="red">no driver</Badge>}
                  {t.conductorName ? <div className="text-xs text-mute">{t.conductorName}</div> : <div><Badge tone="red">no conductor</Badge></div>}
                </>
              ),
            },
            { key: "status", label: "Status", render: (t) => <><StatusBadge s={t.status} />{t.lastLeft && <div className="text-xs text-mute">left {t.lastLeft} {time(t.lastLeftAt)}</div>}</> },
            { key: "v", label: "Vouchers", render: (t) => <Link to={`/admin/trip-vouchers/${t.id}`}>{t.vouchers} / {t.voucherStops}</Link> },
            { key: "seats", label: "Seats", className: "text-right", render: (t) => `${t.seatsTaken}/${t.seats}` },
            { key: "r", label: "", render: (t) => (t.roundTripId && isAdmin ? <Link className="text-sm" to={`/admin/round-trips/${t.roundTripId}`}>Report {t.roundTripId}</Link> : null) },
          ]}
        />
        <p className="mt-3 text-sm text-mute">To change status, bus or crew, use <Link to="/admin/trips">Trips &amp; boarding</Link>.</p>
      </Section>
    </Page>
  );
}
