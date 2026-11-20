/**
 * Home screens for each role:
 *   CounterScreen  /admin/counter        counter officer: buses leaving their terminal from now on (quick sale,
 *                                        voucher, extra departure); folded: already left, and arriving here (Arrived)
 *   CargoScreen    /admin/cargo-desk     cargo staff: the same buses, each with Load cargo; Book a parcel; parcels
 *                                        arriving here (Arrivals & collection)
 *   TicketPrint    /admin/ticket/:id     printed ticket (80 / 58 mm) after a counter sale
 *   MyTrips        /admin/my-trips       driver / conductor: their own trips
 *   Board          /admin/board          manager: the whole day at a glance, refreshing every minute
 */
import { CnicInput, PhoneInput, phoneMessage } from "../../components/PatternFields";
import { CNIC_MESSAGES, cnicProblem, formatCnic } from "../../lib/cnic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, Input, Label, Modal, Page, pkDate, Section, Select, SkeletonBar, SkeletonCards, StatusBadge, Table, useLoad } from "../ui";
import { CargoLoadWindow } from "./CargoLists";
import ExtraDepartureForm from "./ExtraDepartureForm";
import { aisleIndex } from "../../booking/seatRules";
import { SteeringIcon } from "../../booking/SeatMap";

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
  const [addingExtra, setAddingExtra] = useState(false);
  const d = deps.data;

  const arrived = async (t) => {
    let res;
    const ok = await act(async () => { res = await adminApi.tripStatus(t.tripId, { status: "arrived" }); }, "Bus arrived");
    if (ok && res?.autoReport?.roundTripId) act(async () => {}, `Round trip report ${res.autoReport.roundTripId} created`, "An admin completes it.");
    if (ok) deps.reload();
  };

  // The server sorts each bus into a section by its own clock: "upcoming" and "late" (due but not left: no voucher
  // here yet) are the main list; "left" and "arriving" are folded below; "passing" (drop-off only) is not shown.
  const past = d ? d.date < d.today : false;
  const all = d?.departures ?? [];
  const main = all.filter((t) => t.section === "upcoming" || t.section === "late" || (past && t.section === "left"));
  const left = past ? [] : all.filter((t) => t.section === "left");
  const arriving = all.filter((t) => t.section === "arriving");
  const card = (t) => (
    <DepartureCard key={`${t.tripId}-${t.stopId}`} t={t} date={d.date} onSell={setSelling} onArrived={arrived} />
  );

  return (
    <Page
      title={d ? `Counter · ${d.terminal.city}` : "Counter"}
      intro="Buses leaving your terminal, from now on. Sell tickets until the voucher is generated, then print the voucher for the conductor. Buses ending here are under Arriving here."
      actions={(me.role === "agent" || terminalId) && <Btn onClick={() => setAddingExtra(true)}>+ Extra departure</Btn>}
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
      {past && (
        <p className="mb-3 rounded-xl border-2 border-neutral-400 bg-neutral-100 p-3 text-sm text-neutral-800">
          This day has passed: shown for reference. Tickets can no longer be sold on these buses.
        </p>
      )}
      {d && main.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-400 p-4 text-sm text-mute">
          {d.date === d.today
            ? <>No more departures from {d.terminal.city} today.{" "}<button type="button" className="font-bold underline" onClick={() => setDate(pkDate(1))}>See tomorrow</button></>
            : `No departures from ${d.terminal.city} on this day.`}
        </p>
      )}
      {!d && deps.loading && (me.role === "agent" || terminalId) && <SkeletonCards count={3} className="grid gap-3" />}
      <div className="grid gap-3">{main.map(card)}</div>
      {left.length > 0 && (
        <details className="mt-4 rounded-2xl border-2 border-neutral-300 bg-white p-3">
          <summary className="cursor-pointer font-bold">Already left today ({left.length})</summary>
          <p className="mt-1 text-sm text-mute">Voucher generated and the time has passed. Open one to reprint the voucher or the passenger list.</p>
          <div className="mt-3 grid gap-3">{left.map(card)}</div>
        </details>
      )}
      {arriving.length > 0 && (
        <details className="mt-4 rounded-2xl border-2 border-neutral-300 bg-white p-3" open={arriving.some((t) => t.status === "departed" && new Date(t.hereAt) <= new Date(d.now))}>
          <summary className="cursor-pointer font-bold">
            Arriving here ({arriving.length}){arriving.some((t) => t.status === "departed") ? ` · ${arriving.filter((t) => t.status === "departed").length} on the way` : ""}
          </summary>
          <p className="mt-1 text-sm text-mute">Buses that end at {d.terminal.city}. Press Arrived when one comes in: that also makes its round trip report.</p>
          <div className="mt-3 grid gap-3">{arriving.map(card)}</div>
        </details>
      )}
      {selling && <QuickSale trip={selling} onClose={() => setSelling(null)} onSold={() => { setSelling(null); deps.reload(); }} />}
      {addingExtra && <ExtraDepartureForm terminalId={me.role === "agent" ? undefined : terminalId} onClose={() => setAddingExtra(false)} onCreated={deps.reload} />}
    </Page>
  );
}

/** One bus on the counter screen. */
function DepartureCard({ t, date, onSell, onArrived }) {
  const late = t.section === "late";
  return (
    <div className={`rounded-2xl border-2 bg-white p-4 ${late && t.canSell ? "border-red-600" : t.canSell ? "border-black" : "border-neutral-300"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold">
            {time(t.hereAt)} {t.delayMinutes > 0 && <Badge tone="amber">+{t.delayMinutes} min</Badge>}
            {dayKey(t.hereAt) !== date && <span className="ms-1 text-sm font-semibold text-mute">{dayName(t.hereAt)}</span>}
          </p>
          <p className="font-bold">{t.routeName}</p>
          <p className="text-sm text-mute">
            {t.busConfirmed === false ? (
              <><b className="text-amber-800">Bus to confirm</b> (planned {t.busNo})</>
            ) : (
              <>Bus {t.busNo}{t.fleetNo ? ` (${t.fleetNo})` : ""}</>
            )}
            {" "}· driver {t.driverName ?? "–"} · conductor {t.conductorName ?? <span className="font-bold text-red-700">not assigned</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <StatusBadge s={t.status} />
            {late && <Badge tone="red">late · not left yet</Badge>}
            {t.lastLeft && <Badge tone="blue">on route · left {t.lastLeft} {time(t.lastLeftAt)}</Badge>}
            {t.voucher ? <Badge tone="green">voucher {t.voucher.voucherNo} · booking closed</Badge> : t.boardsHere ? <Badge tone="amber">booking open here</Badge> : null}
            {t.endsHere && <Badge>ends here</Badge>}
          </div>
        </div>
        <div className="text-end">
          {t.boardsHere && <p className="text-3xl font-extrabold">{t.seatsLeft}<span className="text-base font-semibold text-mute"> / {t.seats} seats left</span></p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {t.canSell && <Btn kind="primary" disabled={t.seatsLeft === 0} onClick={() => onSell(t)}>Sell ticket</Btn>}
            {t.busConfirmed === false && t.startsHere && ["scheduled", "delayed", "boarding"].includes(t.status) && (
              <Link className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm" to={`/admin/trips?date=${dayKey(t.hereAt)}`}>Confirm bus & crew</Link>
            )}
            {t.boardsHere && <Link className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm" to={`/admin/trip-vouchers/${t.tripId}`}>{t.voucher ? "Voucher & passengers" : "Generate voucher"}</Link>}
            {t.endsHere && t.status === "departed" && <Btn kind="ok" onClick={() => onArrived(t)}>Arrived</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ cargo staff */

/**
 * The cargo staff's screen: the buses leaving their terminal (the same list as the counter), each with Load cargo
 * until that terminal's voucher is generated (then the list is closed: View cargo list). Book a parcel, and the
 * parcels coming here / waiting for collection (Arrivals & collection). Managers and admins choose the terminal.
 */
export function CargoScreen({ me }) {
  const own = me.role === "cargo";
  const [date, setDate] = useState(pkDate());
  const locs = useLoad(() => (own ? Promise.resolve(null) : adminApi.locations()), [own]);
  const [terminalId, setTerminalId] = useState(me.terminalId ?? "");
  const deps = useLoad(
    () => (own || terminalId ? adminApi.counterDepartures(date, own ? undefined : terminalId) : Promise.resolve(null)),
    [date, terminalId],
  );
  useEvery(deps.reload, 60_000);
  const [loading, setLoading] = useState(null); // the bus whose cargo is open
  const d = deps.data;
  const past = d ? d.date < d.today : false;
  // Only buses that can take cargo from here (a boarding point that is not the bus's last stop).
  const all = (d?.departures ?? []).filter((t) => t.cargo);
  const main = all.filter((t) => t.section === "upcoming" || t.section === "late" || (past && t.section === "left"));
  const left = past ? [] : all.filter((t) => t.section === "left");
  const card = (t) => <CargoCard key={`${t.tripId}-${t.stopId}`} t={t} date={d.date} onOpen={setLoading} />;

  return (
    <Page
      title={d ? `Cargo · ${d.terminal.city}` : "Cargo"}
      intro="Buses leaving your terminal, from now on. Load parcels onto a bus until its voucher is generated here; then its cargo list is closed and printed for the conductor."
      actions={
        <>
          <Link to="/admin/cargo-arrivals" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Arrivals & collection</Link>
          <Link to="/admin/book-parcel" className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm">Book a parcel</Link>
        </>
      }
    >
      <Filters>
        {!own && (
          <div>
            <Label htmlFor="cg-t">Terminal</Label>
            <Select id="cg-t" value={terminalId} onChange={(e) => setTerminalId(e.target.value)}
              options={[{ value: "", label: "— choose —" }, ...(locs.data?.terminals ?? []).filter((t) => t.isActive).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))]} />
          </div>
        )}
        <div>
          <Label htmlFor="cg-d">Date</Label>
          <Input id="cg-d" type="date" value={date} onChange={(e) => setDate(e.target.value || pkDate())} />
        </div>
        <Btn onClick={() => setDate(pkDate())}>Today</Btn>
        <Btn onClick={() => setDate(pkDate(1))}>Tomorrow</Btn>
        <Btn onClick={deps.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={deps.err} onRetry={deps.reload} />
      {!own && !terminalId && <p className="text-sm text-mute">Choose a terminal.</p>}
      {(d?.cargoArrivals?.waiting > 0 || d?.cargoArrivals?.onTheWay > 0) && (
        <p className="mb-3 rounded-xl border-2 border-sky-600 bg-sky-50 p-3 text-sm text-sky-900">
          Cargo for {d.terminal.city}: <b>{d.cargoArrivals.onTheWay}</b> on the way, <b>{d.cargoArrivals.waiting}</b> waiting for collection
          {d.cargoArrivals.overdue > 0 ? <> (<b className="text-red-700">{d.cargoArrivals.overdue} overdue</b>)</> : null}.{" "}
          <Link to="/admin/cargo-arrivals" className="font-bold underline">Arrivals & collection</Link>
        </p>
      )}
      {d?.cargoWaiting > 0 && (
        <p className="mb-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
          <b>{d.cargoWaiting} parcel{d.cargoWaiting === 1 ? "" : "s"}</b> booked at {d.terminal.city} {d.cargoWaiting === 1 ? "is" : "are"} waiting for a bus. Use <b>Load cargo</b> on the bus going there.
        </p>
      )}
      {past && (
        <p className="mb-3 rounded-xl border-2 border-neutral-400 bg-neutral-100 p-3 text-sm text-neutral-800">
          This day has passed: shown for reference. Cargo can no longer be loaded on these buses.
        </p>
      )}
      {d && main.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-400 p-4 text-sm text-mute">
          {d.date === d.today
            ? <>No more buses taking cargo from {d.terminal.city} today.{" "}<button type="button" className="font-bold underline" onClick={() => setDate(pkDate(1))}>See tomorrow</button></>
            : `No buses taking cargo from ${d.terminal.city} on this day.`}
        </p>
      )}
      {!d && deps.loading && (own || terminalId) && <SkeletonCards count={3} className="grid gap-3" />}
      <div className="grid gap-3">{main.map(card)}</div>
      {left.length > 0 && (
        <details className="mt-4 rounded-2xl border-2 border-neutral-300 bg-white p-3">
          <summary className="cursor-pointer font-bold">Already left today ({left.length})</summary>
          <p className="mt-1 text-sm text-mute">Voucher generated and the time has passed: their cargo lists are closed. Open one to see or print it.</p>
          <div className="mt-3 grid gap-3">{left.map(card)}</div>
        </details>
      )}
      {loading && <CargoLoadWindow tripId={loading.tripId} stopId={loading.stopId} onClose={() => { setLoading(null); deps.reload(); }} />}
    </Page>
  );
}

/** One bus on the cargo screen. */
function CargoCard({ t, date, onOpen }) {
  const late = t.section === "late";
  const closed = t.cargo.status === "closed";
  const n = t.cargo.parcelCount;
  return (
    <div className={`rounded-2xl border-2 bg-white p-4 ${closed ? "border-neutral-300" : late ? "border-red-600" : "border-black"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold">
            {time(t.hereAt)} {t.delayMinutes > 0 && <Badge tone="amber">+{t.delayMinutes} min</Badge>}
            {dayKey(t.hereAt) !== date && <span className="ms-1 text-sm font-semibold text-mute">{dayName(t.hereAt)}</span>}
          </p>
          <p className="font-bold">{t.routeName}</p>
          <p className="text-sm text-mute">
            {t.busConfirmed === false ? <><b className="text-amber-800">Bus to confirm</b> (planned {t.busNo})</> : <>Bus {t.busNo}{t.fleetNo ? ` (${t.fleetNo})` : ""}</>}
            {" "}· conductor {t.conductorName ?? "–"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <StatusBadge s={t.status} />
            {late && !closed && <Badge tone="red">late · not left yet</Badge>}
            {closed ? <Badge tone="green">voucher generated · cargo list closed</Badge> : <Badge tone="amber">loading open</Badge>}
          </div>
        </div>
        <div className="text-end">
          <p className="text-3xl font-extrabold">{n}<span className="text-base font-semibold text-mute"> parcel{n === 1 ? "" : "s"} on the bus</span></p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            {closed ? (
              <>
                <Btn onClick={() => onOpen(t)}>View cargo list{t.cargo.listNo ? ` ${t.cargo.listNo}` : ""}</Btn>
                {t.cargo.listId && <a className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm" href={`/admin/cargo-list/${t.cargo.listId}`} target="_blank" rel="noreferrer">Print list</a>}
              </>
            ) : (
              <Btn kind="primary" onClick={() => onOpen(t)}>{n > 0 ? `Load cargo (${n})` : "Load cargo"}</Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quick counter sale: choose seats and destination, type the passengers, take the cash, print. */
function QuickSale({ trip, onClose, onSold }) {
  const seats = useLoad(() => adminApi.tripSeats(trip.tripId), [trip.tripId], { fresh: true }); // seats for sale: never older data
  const [picked, setPicked] = useState([]); // seat ids in click order
  const [dest, setDest] = useState(trip.destinations.at(-1)?.stopId ?? "");
  const [contact, setContact] = useState({ name: "", phone: "", cnic: "" });
  const [triedSale, setTriedSale] = useState(false); // Sell pressed: show the mobile number's message
  const [pax, setPax] = useState({}); // seatId -> { name, gender }
  const [busy, setBusy] = useState(false);
  const [sold, setSold] = useState(null);
  const fare = trip.destinations.find((x) => String(x.stopId) === String(dest))?.fare ?? 0;
  const [gone, setGone] = useState(""); // "Seat 12 was just sold…" after a refresh unpicked it

  // Keeps the seats current while the window is open: every 30 seconds and when staff come back to the tab, quietly
  // (a failed refresh keeps the map as it is). Not while a sale is being saved or after it is done.
  const busyRef = useRef(false);
  busyRef.current = busy || Boolean(sold);
  const lastRefresh = useRef(Date.now());
  const refreshSeats = useCallback(async () => {
    if (busyRef.current || document.visibilityState === "hidden") return;
    if (Date.now() - lastRefresh.current < 5_000) return; // "tab visible" and "window focus" often come together
    lastRefresh.current = Date.now();
    let d;
    try {
      d = await adminApi.tripSeats(trip.tripId);
    } catch {
      return;
    }
    if (!busyRef.current) seats.setData(d);
  }, [trip.tripId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(refreshSeats, 30_000);
    const onBack = () => {
      if (document.visibilityState === "visible") refreshSeats();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [refreshSeats]);
  // A picked seat that is no longer free (sold by someone else meanwhile) is unpicked, with a note.
  useEffect(() => {
    const list = seats.data;
    if (!list || !picked.length) return;
    const lost = picked.filter((id) => list.find((s) => s.seatId === id)?.status !== "available");
    if (!lost.length) return;
    setPicked((p) => p.filter((id) => !lost.includes(id)));
    const names = lost.map((id) => list.find((s) => s.seatId === id)?.seatNumber ?? id).join(", ");
    setGone(`Seat${lost.length === 1 ? "" : "s"} ${names} ${lost.length === 1 ? "was" : "were"} just sold by someone else. Please choose another seat.`);
  }, [seats.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const grid = useMemo(() => {
    const list = seats.data ?? [];
    const rows = [...new Set(list.map((s) => s.rowNo))].sort((a, b) => a - b);
    const maxCol = Math.max(0, ...list.map((s) => s.colNo));
    // The same aisle rule as the website seat map (an empty column on the fleet layouts: nothing extra to draw).
    const a = aisleIndex(list.map((s) => ({ row: s.rowNo, col: s.colNo - 1, deck: s.deck })));
    return { list, rows, maxCol, aisle: a >= 0 ? a + 1 : 0 };
  }, [seats.data]);

  const toggle = (s) => {
    if (s.status !== "available") return;
    setGone("");
    setPicked((p) => (p.includes(s.seatId) ? p.filter((x) => x !== s.seatId) : [...p, s.seatId]));
    setPax((p) => ({ ...p, [s.seatId]: p[s.seatId] ?? { name: "", gender: "male" } }));
  };

  async function sell(e) {
    e.preventDefault();
    if (!picked.length) return act(() => Promise.reject(new Error("Choose at least one seat.")));
    // One CNIC per sale (the customer's; a family needs one). Checked again by the server.
    setTriedSale(true);
    const phoneIssue = phoneMessage(contact.phone, { required: true });
    if (phoneIssue) return act(() => Promise.reject(new Error(`Mobile number: ${phoneIssue}`)));
    const cnicIssue = cnicProblem(contact.cnic);
    if (cnicIssue) return act(() => Promise.reject(new Error(`Customer's CNIC: ${CNIC_MESSAGES[cnicIssue].en}`)));
    setBusy(true);
    let booking;
    const ok = await act(async () => {
      booking = await adminApi.createCounterBooking({
        tripId: trip.tripId,
        boardingStopId: trip.stopId,
        droppingStopId: Number(dest),
        contact: { name: contact.name.trim(), phone: contact.phone.trim() },
        holderCnic: formatCnic(contact.cnic),
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
    else {
      // Not sold (often: a seat was just taken): show the seats as they are now.
      busyRef.current = false;
      lastRefresh.current = 0;
      refreshSeats();
    }
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
  const fieldCls = "w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black";
  const heading = (t) => <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">{t}</h3>;
  const chip = (cls, label) => (
    <span className="inline-flex items-center gap-1.5"><span aria-hidden className={`inline-block h-3.5 w-3.5 rounded border-2 ${cls}`} />{label}</span>
  );
  return (
    <Modal title={`Sell ticket · ${time(trip.hereAt)} ${trip.routeName}`} onClose={onClose} size="xl">
      <form onSubmit={sell} className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* Seat map: only as wide as the seats. */}
        <div className="lg:border-e lg:border-neutral-200 lg:pe-6">
          <div className="flex items-baseline justify-between gap-3">
            {heading("Choose seats")}
            {picked.length > 0 && <span className="text-xs font-semibold text-neutral-600">{picked.length} selected</span>}
          </div>
          <ErrorNote err={seats.err} onRetry={seats.reload} />
          {gone && <p role="alert" className="mx-auto mt-2 max-w-xs rounded-xl border-2 border-amber-500 bg-amber-50 p-2 text-sm text-amber-900">{gone}</p>}
          <div className="mx-auto mt-3 w-fit rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="mb-2 text-center text-[10px] font-bold tracking-widest text-neutral-500">▲ FRONT</p>
            <div className="grid gap-1.5">
              {grid.rows.map((r) => (
                <div key={r} className="flex gap-1.5">
                  {Array.from({ length: grid.maxCol }, (_, i) => i + 1).map((c) => {
                    const s = grid.list.find((x) => x.rowNo === r && x.colNo === c);
                    const gap = grid.aisle && c === grid.aisle + 1 ? <span key={`g${c}`} className="w-3" aria-hidden /> : null;
                    if (!s) return [gap, <span key={c} className="h-11 w-11" aria-hidden />];
                    if (s.kind === "driver")
                      return [gap, <span key={c} role="img" aria-label="Driver" title="Driver" className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-dashed border-neutral-400 text-neutral-500"><SteeringIcon /></span>];
                    const on = picked.includes(s.seatId);
                    const cls = on
                      ? "border-black bg-black text-white"
                      : s.status === "available"
                        ? "border-black bg-white hover:bg-neutral-100"
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
          </div>
          <div className="mx-auto mt-3 grid w-fit grid-cols-2 gap-x-5 gap-y-1.5 text-xs text-neutral-700">
            {chip("border-black bg-white", "Available")}
            {chip("border-black bg-black", "Selected")}
            {chip("border-pink-300 bg-pink-100", "Taken · woman")}
            {chip("border-sky-300 bg-sky-100", "Taken · man")}
          </div>
          <p className="mx-auto mt-2 max-w-xs text-center text-xs text-mute">A man and a woman from different bookings cannot sit side by side.</p>
        </div>

        {/* The sale. */}
        <div className="grid content-start gap-5">
          <div>
            <Label htmlFor="qs-to">Going to *</Label>
            <Select id="qs-to" required value={dest} onChange={(e) => setDest(e.target.value)} options={trip.destinations.map((x) => ({ value: x.stopId, label: `${x.city} · Rs ${money(x.fare)} per seat` }))} />
          </div>

          <section className="grid gap-3">
            {heading("Customer")}
            <div>
              <Label htmlFor="qs-n">Customer name *</Label>
              <Input id="qs-n" required minLength={2} autoComplete="off" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="qs-p">Mobile number *</Label>
                <PhoneInput id="qs-p" required className={fieldCls} value={contact.phone} onChange={(x) => setContact({ ...contact, phone: x })} showErrors={triedSale} />
              </div>
              <div>
                <Label htmlFor="qs-c">CNIC *</Label>
                <CnicInput id="qs-c" required className={fieldCls} value={contact.cnic} onChange={(x) => setContact({ ...contact, cnic: x })} showErrors={triedSale} />
              </div>
            </div>
          </section>

          <section className="grid gap-2">
            {heading(`Passengers${picked.length ? ` (${picked.length})` : ""}`)}
            {picked.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-400 p-3 text-sm text-mute">Choose seats on the map. Each seat adds a passenger here.</p>
            ) : (
              picked.map((id, i) => (
                <div key={id} className="flex items-center gap-2">
                  <span className="flex h-10 min-w-12 shrink-0 items-center justify-center rounded-lg bg-black px-2 text-sm font-bold text-white">{seatOf(id)?.seatNumber}</span>
                  <Input aria-label="Passenger name" className="min-w-0 flex-1" required={i > 0} minLength={2} placeholder={i === 0 ? `${contact.name || "Customer"} (same as customer)` : "Passenger name"}
                    value={pax[id]?.name ?? ""} onChange={(e) => setPax({ ...pax, [id]: { ...pax[id], name: e.target.value } })} />
                  <Select aria-label="Gender" className="!w-28 shrink-0" value={pax[id]?.gender ?? "male"} onChange={(e) => setPax({ ...pax, [id]: { ...pax[id], gender: e.target.value } })}
                    options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                </div>
              ))
            )}
          </section>

          {/* Stays in view at the bottom of the window when the passenger list is long. */}
          <div className="sticky bottom-0 grid gap-3 rounded-2xl border-2 border-black bg-white p-4 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-neutral-700">
                {picked.length} × Rs {money(fare)} <span className="text-mute">({picked.length === 1 ? "1 seat" : `${picked.length} seats`})</span>
              </p>
              <p className="text-2xl font-extrabold">Rs {money(picked.length * fare)} <span className="text-sm font-semibold text-mute">cash</span></p>
            </div>
            <div className="flex gap-2">
              <Btn kind="primary" type="submit" className="flex-1" disabled={busy || !picked.length}>{busy ? "Selling…" : "Cash received · sell"}</Btn>
              <Btn onClick={onClose}>Cancel</Btn>
            </div>
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
        {x.ticketQr?.svg && (
          <div className="my-1 text-center">
            {/* SVG made by the server's QR library from the ticket's check link (/t/<code>). */}
            <div className="mx-auto [&>svg]:block [&>svg]:h-full [&>svg]:w-full" style={{ width: width === 58 ? "26mm" : "30mm", height: width === 58 ? "26mm" : "30mm" }} dangerouslySetInnerHTML={{ __html: x.ticketQr.svg }} />
            <div className="mt-0.5 text-[0.85em]">Scan to check this ticket</div>
          </div>
        )}
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
      {!trips.data && trips.loading && <SkeletonCards count={3} className="mt-6 grid gap-3" />}
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
      <p className={`mt-1 text-2xl font-extrabold ${tone === "red" && value > 0 ? "text-red-700" : ""}`}>{value ?? <SkeletonBar className="mt-1 h-7 w-12" />}</p>
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
          {c?.busToConfirm > 0 && <Link to={`/admin/trips?date=${date}`}><Badge tone="amber">{c.busToConfirm} bus{c.busToConfirm === 1 ? "" : "es"} to confirm</Badge></Link>}
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
            {
              key: "route",
              label: "Route",
              render: (t) => (
                <>
                  {t.routeName}
                  <div className="text-xs text-mute">
                    from {t.fromCity} · {t.busConfirmed === false ? <><Badge tone="amber">bus to confirm</Badge> planned {t.busNo}</> : <>bus {t.busNo}</>}
                  </div>
                </>
              ),
            },
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
        <p className="mt-3 text-sm text-mute">To change status, confirm the bus or set the crew, use <Link to={`/admin/trips?date=${date}`}>Trips &amp; boarding</Link>.</p>
      </Section>
    </Page>
  );
}
