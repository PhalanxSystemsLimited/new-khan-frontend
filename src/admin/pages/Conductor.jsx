/**
 * Conductor screen (/admin/conductor), made for a phone:
 *   1. Enter the voucher number from the counter slip.
 *   2. See the bus live: every seat (taken or empty), passengers with their destination. Refreshes every 30 s.
 *   3. Tap an empty seat to book a road passenger (fare collected, or free). The seat is then taken for every
 *      later terminal, so it cannot be sold twice.
 *   4. Tap a passenger who did not travel to mark it with a note.
 * Only the trip's conductor (or its stand-in) can open it; managers and admins can open any trip.
 */
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Input, Label, Modal, Page, Section, Select, StatusBadge } from "../ui";
import { departure, money } from "../../report/format";

const KEY = "nk-conductor-voucher";
const remembered = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const remember = (no) => {
  try {
    localStorage.setItem(KEY, no);
  } catch {
    // storage blocked: the conductor types the number again next time
  }
};

/** Seat grid in bus order, with an aisle gap in the middle. */
function SeatMap({ seats, onSeat }) {
  const decks = [...new Set(seats.map((s) => s.deck))];
  return decks.map((deck) => {
    const list = seats.filter((s) => s.deck === deck);
    const maxCol = Math.max(...list.map((s) => s.colNo));
    const aisle = maxCol === 4 ? 2 : maxCol === 3 ? 1 : maxCol >= 5 ? Math.floor(maxCol / 2) : 0;
    const rows = [...new Set(list.map((s) => s.rowNo))].sort((a, b) => a - b);
    return (
      <div key={deck} className="mx-auto w-fit">
        {decks.length > 1 && <p className="mb-1 text-center text-xs font-bold">Deck {deck}</p>}
        <p className="mb-2 text-center text-xs font-bold tracking-widest text-neutral-500">▲ FRONT</p>
        <div className="grid gap-1.5">
          {rows.map((r) => (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: maxCol }, (_, i) => i + 1).map((c) => {
                const s = list.find((x) => x.rowNo === r && x.colNo === c);
                const gap = aisle && c === aisle + 1 ? <span key={`g${c}`} className="w-4" aria-hidden /> : null;
                if (!s) return [gap, <span key={c} className="h-14 w-14" aria-hidden />];
                const p = s.passenger;
                const cls = !s.bookable
                  ? "border-neutral-300 bg-neutral-200 text-neutral-400"
                  : p
                    ? p.gender === "female" ? "border-pink-500 bg-pink-100 text-pink-950" : "border-sky-600 bg-sky-100 text-sky-950"
                    : "border-black bg-white text-black";
                return [
                  gap,
                  <button
                    key={c}
                    type="button"
                    disabled={!s.bookable}
                    onClick={() => onSeat(s)}
                    className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 text-[11px] font-bold leading-tight ${cls}`}
                    aria-label={p ? `Seat ${s.seatNumber}: ${p.name} to ${p.to}` : `Seat ${s.seatNumber}: empty${s.noShow ? " (passenger did not travel)" : ""}`}
                  >
                    <span>{s.seatNumber}</span>
                    {p ? <span className="w-full truncate px-0.5 font-semibold">{p.to}</span> : <span className="font-normal">{s.noShow ? "no-show" : "empty"}</span>}
                  </button>,
                ];
              })}
            </div>
          ))}
        </div>
      </div>
    );
  });
}

export function ConductorScreen() {
  const [no, setNo] = useState(remembered);
  const [openNo, setOpenNo] = useState("");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [seat, setSeat] = useState(null); // seat being booked or looked at

  const load = useCallback(async (n) => {
    setBusy(true);
    try {
      const d = await adminApi.conductorVoucher(n);
      setData(d);
      setErr("");
      setOpenNo(n);
      remember(n);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }, []);

  // Live: refresh every 30 seconds while a trip is open.
  useEffect(() => {
    if (!openNo) return undefined;
    const t = setInterval(() => load(openNo), 30_000);
    return () => clearInterval(t);
  }, [openNo, load]);

  const submit = (e) => {
    e.preventDefault();
    const n = no.replace(/\D/g, "");
    if (n.length !== 10) return setErr("Voucher numbers have 10 digits.");
    load(n);
  };

  const taken = data?.seats.filter((s) => s.passenger).length ?? 0;
  const bookable = data?.seats.filter((s) => s.bookable).length ?? 0;
  const free = data?.passengers.filter((p) => p.isFree && p.status !== "no_show").length ?? 0;
  const byDest = data
    ? Object.entries(
        data.passengers
          .filter((p) => p.status !== "no_show")
          .reduce((m, p) => ({ ...m, [p.to]: [...(m[p.to] ?? []), p] }), {}),
      )
    : [];

  return (
    <Page title="Conductor" intro="Enter the voucher number from the counter slip to see your bus live and add road passengers.">
      <Section>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="grow">
            <Label htmlFor="c-no">Voucher number</Label>
            <Input id="c-no" inputMode="numeric" autoComplete="off" value={no} onChange={(e) => setNo(e.target.value)} placeholder="1000000001" />
          </div>
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Opening…" : "Open"}</Btn>
          {data && <Btn onClick={() => load(openNo)} disabled={busy}>Refresh</Btn>}
        </form>
        <ErrorNote err={err} />
      </Section>

      {data && (
        <>
          <Section title={data.trip.routeName}>
            <p className="text-sm">
              Departed {departure(data.trip.departureAt)} · bus <b>{data.trip.busNo}</b> · driver {data.trip.driverName ?? "–"} · conductor {data.trip.conductorName ?? "–"} · <StatusBadge s={data.trip.status} />
            </p>
            {data.voucher.status === "replaced" && (
              <p className="mt-2 rounded-xl border border-amber-400 bg-amber-50 p-2 text-sm">
                This voucher was replaced{data.voucher.replacedByNo ? ` by ${data.voucher.replacedByNo}` : ""}. The trip below is still up to date.
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-neutral-300 p-2"><p className="text-xs text-mute">On the bus</p><p className="text-2xl font-extrabold">{taken}</p></div>
              <div className="rounded-xl border border-neutral-300 p-2"><p className="text-xs text-mute">Empty seats</p><p className="text-2xl font-extrabold">{bookable - taken}</p></div>
              <div className="rounded-xl border border-neutral-300 p-2"><p className="text-xs text-mute">Free</p><p className="text-2xl font-extrabold">{free}</p></div>
            </div>
            <p className="mt-2 text-xs text-mute">
              Stops: {data.stops.map((s) => `${s.city}${s.voucherGenerated ? " ✓" : ""}`).join(" → ")} (✓ = voucher generated, booking closed there).
              Updated {new Date(data.loadedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" })}, refreshes every 30 seconds.
            </p>
          </Section>

          <Section title="Seats">
            <p className="mb-3 text-sm text-mute">
              {data.roadBooking ? "Tap an empty seat to add a road passenger, or a taken seat to see who is on it." : "Road passengers can be added once the first terminal has generated its voucher."}
            </p>
            <SeatMap seats={data.seats} onSeat={setSeat} />
          </Section>

          <Section title="Passengers by destination">
            {byDest.length === 0 && <p className="text-sm text-mute">No passengers yet.</p>}
            {byDest.map(([dest, list]) => (
              <div key={dest} className="mb-3">
                <p className="font-bold">{dest} <span className="font-normal text-mute">· {list.length}</span></p>
                <ul className="mt-1 grid gap-1 text-sm">
                  {list.map((p) => {
                    const s = data.seats.find((x) => x.passenger?.ticketId === p.ticketId);
                    return (
                      <li key={p.ticketId} className="flex flex-wrap items-center gap-2">
                        <b className="w-10">{s?.seatNumber ?? "–"}</b>
                        <span>{p.name}</span>
                        <span className="text-mute">from {p.from}</span>
                        {p.isFree && <Badge tone="blue">free</Badge>}
                        {p.onRoad && <Badge>road</Badge>}
                        {!p.paid && <Badge tone="amber">not paid</Badge>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {data.passengers.some((p) => p.status === "no_show") && (
              <p className="mt-2 text-sm">
                <b>Did not travel:</b> {data.passengers.filter((p) => p.status === "no_show").map((p) => `${p.name}${p.noShowNote ? ` (${p.noShowNote})` : ""}`).join(", ")}
              </p>
            )}
          </Section>
        </>
      )}

      {seat && data && (
        <SeatDialog seat={seat} data={data} onClose={() => setSeat(null)} onDone={() => { setSeat(null); load(openNo); }} />
      )}
    </Page>
  );
}

function SeatDialog({ seat, data, onClose, onDone }) {
  const p = seat.passenger;
  const road = data.roadBooking;
  const [f, setF] = useState({ name: "", gender: "male", phone: "", destinationStopId: road?.destinations.at(-1)?.id ?? "", fare: "", free: false });
  const [note, setNote] = useState("Did not travel");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function book(e) {
    e.preventDefault();
    setBusy(true);
    const body = {
      seatId: seat.seatId,
      name: f.name.trim(),
      gender: f.gender,
      destinationStopId: Number(f.destinationStopId),
      fare: f.free ? 0 : Math.max(0, Math.round(Number(f.fare)) || 0),
      free: f.free,
      ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
    };
    const ok = await act(() => adminApi.conductorAddPassenger(data.trip.id, body), `Seat ${seat.seatNumber} booked`, f.free ? "Travelling free." : `Fare Rs ${money(body.fare)} collected.`);
    setBusy(false);
    if (ok) onDone();
  }
  async function noShow(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await act(() => adminApi.conductorNoShow(p.ticketId, note.trim()), "Marked as not travelled", `Seat ${seat.seatNumber} is now empty.`);
    setBusy(false);
    if (ok) onDone();
  }

  if (p)
    return (
      <Modal title={`Seat ${seat.seatNumber}`} onClose={onClose}>
        <p className="text-lg font-bold">{p.name}</p>
        <p className="text-sm">
          {p.from} → {p.to} · {p.isFree ? "free" : `Rs ${money(p.fare)}`}{p.phone ? ` · ${p.phone}` : ""}{p.onRoad ? " · road passenger" : ""} · booking {p.pnr}
        </p>
        {p.paid && (
          <form onSubmit={noShow} className="mt-4 grid gap-2 rounded-xl border border-neutral-300 p-3">
            <Label htmlFor="ns-note">Passenger did not travel? Note</Label>
            <Input id="ns-note" required minLength={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            <Btn kind="danger" type="submit" disabled={busy}>Mark as did not travel</Btn>
          </form>
        )}
      </Modal>
    );

  return (
    <Modal title={`Seat ${seat.seatNumber}: road passenger`} onClose={onClose}>
      {!road ? (
        <p>Road passengers can be added once the first terminal has generated its voucher.</p>
      ) : (
        <form onSubmit={book} className="grid gap-3">
          {seat.noShow && <p className="rounded-xl bg-neutral-100 p-2 text-sm">{seat.noShow.name} booked this seat but did not travel.</p>}
          <p className="text-sm text-mute">Boarding after {road.fromCity}.</p>
          <div>
            <Label htmlFor="rp-name">Name *</Label>
            <Input id="rp-name" required minLength={2} maxLength={120} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="rp-g">Gender *</Label>
              <Select id="rp-g" value={f.gender} onChange={(e) => set("gender", e.target.value)} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
            </div>
            <div>
              <Label htmlFor="rp-to">Going to *</Label>
              <Select id="rp-to" required value={f.destinationStopId} onChange={(e) => set("destinationStopId", e.target.value)} options={road.destinations.map((d) => ({ value: d.id, label: d.city }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="rp-ph">Phone (optional)</Label>
            <Input id="rp-ph" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03001234567" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-black" checked={f.free} onChange={(e) => set("free", e.target.checked)} />
            Travels free
          </label>
          {!f.free && (
            <div>
              <Label htmlFor="rp-fare">Fare collected (Rs) *</Label>
              <Input id="rp-fare" required type="number" min="1" step="1" inputMode="numeric" value={f.fare} onChange={(e) => set("fare", e.target.value)} />
            </div>
          )}
          <p className="text-xs text-mute">A male and a female passenger from different bookings cannot sit side by side; the system checks this.</p>
          <div className="flex gap-2">
            <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Booking…" : "Book seat"}</Btn>
            <Btn onClick={onClose}>Cancel</Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
