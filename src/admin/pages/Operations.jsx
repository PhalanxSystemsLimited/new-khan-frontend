/** Daily operations: dashboard, trips and boarding, bookings (search, cancel, cash), refunds queue. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, Filters, fmtD, fmtDT, fmtT, Input, Label, Modal, Page, pkDate, rs, Section, Select,
  StatusBadge, Table, useConfirm, useForm, useLoad,
} from "../ui";

/* ------------------------------------------------------------------ helpers */

export function Pager({ p, onPage }) {
  if (!p || p.totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <Btn small disabled={p.page <= 1} onClick={() => onPage(p.page - 1)}>‹ Previous</Btn>
      <span>Page {p.page} of {p.totalPages} · {p.total} in total</span>
      <Btn small disabled={p.page >= p.totalPages} onClick={() => onPage(p.page + 1)}>Next ›</Btn>
    </div>
  );
}

const Stat = ({ label, value, to }) => {
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-black">{value ?? "…"}</p>
    </>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl border-2 border-black bg-white p-4 no-underline hover:bg-neutral-50">{body}</Link>
  ) : (
    <div className="rounded-2xl border-2 border-black bg-white p-4">{body}</div>
  );
};

/* ------------------------------------------------------------------ dashboard */

export function Dashboard() {
  const today = pkDate();
  const sum = useLoad(() => adminApi.summary(today, today), [today]);
  const trips = useLoad(() => adminApi.trips(today), [today]);
  const refunds = useLoad(() => adminApi.refunds({ status: "requested", limit: 1 }), []);
  const s = sum.data;
  const t = trips.data ?? [];
  return (
    <Page title="Dashboard" intro={`Today, ${fmtD(Date.now())} (Pakistan time).`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Bookings today" value={s?.confirmedBookings} to="/admin/bookings" />
        <Stat label="Seats sold today" value={s?.seatsSold} />
        <Stat label="Taken today" value={s ? rs(s.grossRevenue) : null} to="/admin/reports" />
        <Stat label="Cancellations" value={s?.cancellations} />
        <Stat label="Departures today" value={trips.data ? t.length : null} to="/admin/trips" />
        <Stat label="Refunds to review" value={refunds.data?.pagination?.total} to="/admin/refunds" />
      </div>
      <ErrorNote err={sum.err || trips.err || refunds.err} />
      <Section title="Today's departures" actions={<Link to="/admin/trips" className="btn btn-ghost !min-h-9 !px-3 !py-1 text-sm">Open trips</Link>}>
        <Table
          loading={trips.loading}
          rows={trips.data}
          empty="No departures today. Generate trips from Schedules & trips."
          cols={[
            { key: "t", label: "Departs", render: (r) => fmtT(r.departureAt) },
            { key: "routeName", label: "Route" },
            { key: "registrationNo", label: "Bus" },
            { key: "seatsTaken", label: "Seats taken" },
            {
            key: "status",
            label: "Status",
            render: (r) => (
              <>
                <StatusBadge s={r.status} />
                {r.lastLeft && <div className="mt-1 text-xs text-mute">On route: left {r.lastLeft} {fmtT(r.lastLeftAt)}</div>}
              </>
            ),
          },
          ]}
        />
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ trips */

const NEXT = {
  scheduled: ["boarding", "delayed", "cancelled"],
  delayed: ["boarding", "scheduled", "cancelled"],
  boarding: ["departed", "delayed", "cancelled"],
  departed: ["arrived"],
  arrived: [],
  cancelled: [],
};
const STATUS_HELP = {
  boarding: "Passengers are boarding; online cancellation stops.",
  delayed: "Customers see the delay on their booking.",
  departed: "The bus has left.",
  arrived: "Trip finished; confirmed bookings become completed.",
  scheduled: "Back to on time.",
  cancelled: "Cancels EVERY booking on this trip and creates a full refund for each paid one. Admins only.",
};

function ManifestModal({ trip, onClose }) {
  const m = useLoad(() => adminApi.manifest(trip.id), [trip.id]);
  const boarded = (m.data ?? []).filter((r) => r.status === "boarded").length;
  return (
    <Modal wide title={`Passengers · ${trip.routeName} · ${fmtDT(trip.departureAt)}`} onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{m.data ? `${m.data.length} passengers, ${boarded} boarded` : "Loading…"}</span>
        <div className="flex gap-2">
          <Btn small onClick={m.reload}>Refresh</Btn>
          <Btn small onClick={() => window.print()}>Print</Btn>
        </div>
      </div>
      <ErrorNote err={m.err} onRetry={m.reload} />
      <Table
        rows={m.data}
        loading={m.loading}
        rowKey={(r) => r.ticketId}
        empty="No confirmed passengers yet."
        cols={[
          { key: "seatNumber", label: "Seat" },
          { key: "passengerName", label: "Passenger", render: (r) => <><b>{r.passengerName}</b><br /><span className="text-xs text-mute">{r.passengerGender}{r.passengerCnic ? ` · ${r.passengerCnic}` : ""}</span></> },
          { key: "passengerPhone", label: "Phone" },
          { key: "j", label: "Boards → leaves", render: (r) => `${r.boardingTerminal} → ${r.droppingTerminal}` },
          { key: "pnr", label: "Booking", render: (r) => <><span className="font-mono">{r.pnr}</span><br /><span className="text-xs text-mute">{r.ticketNo}</span></> },
          { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
          {
            key: "a",
            label: "",
            render: (r) =>
              r.status === "confirmed" && ["boarding", "delayed", "scheduled"].includes(trip.status) ? (
                <Btn small kind="ok" onClick={async () => (await act(() => adminApi.board(r.ticketId), "Boarded", `${r.passengerName}, seat ${r.seatNumber}`)) && m.reload()}>Board</Btn>
              ) : null,
          },
        ]}
      />
    </Modal>
  );
}

export function Trips({ me, isAdmin, isManager }) {
  const [date, setDate] = useState(pkDate());
  const [status, setStatus] = useState("");
  const trips = useLoad(() => adminApi.trips(date, status || undefined), [date, status]);
  const [manifest, setManifest] = useState(null);
  const [openForm, form] = useForm();
  const opts = useLoad(
    () =>
      isManager
        ? Promise.all([
            adminApi.buses(), adminApi.drivers(), isAdmin ? adminApi.routes() : Promise.resolve([]), adminApi.conductors(), adminApi.staffAccounts(),
            adminApi.crew("hostess").catch(() => []),
          ])
        : Promise.resolve([[], [], [], [], [], []]),
    [isManager, isAdmin],
  );
  const [buses, drivers, routes, conductors, staffAccounts, hostesses] = opts.data ?? [[], [], [], [], [], []];
  /** Hostesses registered under Employees (the trip keeps the name, so an older typed name stays selectable). */
  const hostessOpts = (current) => [
    ...hostesses.map((h) => ({ value: h.fullName, label: `${h.fullName} (${h.employeeCode})` })),
    ...(current && !hostesses.some((h) => h.fullName === current) ? [{ value: current, label: current }] : []),
  ];
  const conductorOpts = conductors.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.fullName }));
  const standInOpts = staffAccounts.map((u) => ({ value: u.id, label: `${u.fullName || u.email} (${u.role === "agent" ? "counter staff" : u.role.replace("_", " ")})` }));
  const done = (t) => ["departed", "arrived"].includes(t.status);

  const applyStatus = async (t, b) => {
    let res;
    const ok = await act(async () => { res = await adminApi.tripStatus(t.id, b); }, b.status === "arrived" ? "Bus arrived" : "Trip updated");
    if (ok && res?.autoReport?.roundTripId) {
      act(async () => {}, `Round trip report ${res.autoReport.roundTripId} created`, `${res.autoReport.tripIds.length} trip(s), filled in from the vouchers. An admin adds diesel and the other expenses, then finalizes it.`);
    }
    if (ok) trips.reload();
    return ok;
  };
  const changeStatus = (t) =>
    openForm({
      title: `Change status · ${t.routeName}, ${fmtT(t.departureAt)}`,
      note: "Pick the new status. " + NEXT[t.status].map((s) => `${s}: ${STATUS_HELP[s]}`).join(" "),
      fields: [
        { name: "status", label: "New status", type: "select", required: true, options: NEXT[t.status].filter((s) => isAdmin || s !== "cancelled").map((s) => ({ value: s, label: s })) },
        { name: "delayMinutes", label: "Delay (minutes)", type: "number", min: 0, max: 1440, hint: "Only for Delayed." },
        { name: "reason", label: "Reason", type: "textarea", hint: "Required to cancel a trip." },
      ],
      initial: { status: NEXT[t.status][0] },
      submitLabel: "Update status",
      onSubmit: (b) => applyStatus(t, b),
    });

  const standInField = {
    name: "standInConductorId", label: "Stand-in conductor (staff)", type: "select", nullable: true, options: standInOpts,
    hint: "Only when the conductor could not go and a staff member went instead. Can be filled in after the trip.",
  };
  const assign = (t) =>
    done(t)
      ? openForm({
          title: `Stand-in conductor · ${t.routeName}, ${fmtT(t.departureAt)}`,
          note: "The trip has left, so only the staff member who went as conductor can still be recorded.",
          fields: [standInField],
          initial: { standInConductorId: t.standInConductorId ?? "" },
          onSubmit: (b) => act(() => adminApi.tripAssign(t.id, b), "Saved").then((ok) => (ok && trips.reload(), ok)),
        })
      : openForm({
          title: `Bus and crew · ${t.routeName}, ${fmtT(t.departureAt)}`,
          note: "A replacement bus must have the same seat layout. The bus cannot leave without a conductor.",
          fields: [
            { name: "busId", label: "Bus", type: "select", numeric: true, required: true, options: buses.filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo}${b.fleetNo ? ` (${b.fleetNo})` : ""} · ${b.layoutName}` })) },
            { name: "driverId", label: "Driver", type: "select", numeric: true, nullable: true, options: drivers.filter((d) => d.isActive && !d.licenseExpired).map((d) => ({ value: d.id, label: d.fullName })) },
            { name: "conductorId", label: "Conductor", type: "select", numeric: true, nullable: true, options: conductorOpts, hint: conductorOpts.length ? undefined : "No conductors yet: add them under Fleet & people → Conductors." },
            standInField,
            { name: "hostessName", label: "Hostess", type: "select", nullable: true, options: hostessOpts(t.hostessName), hint: hostesses.length ? undefined : "No hostesses registered yet: add them under Employees (designation Hostess)." },
          ],
          initial: { busId: t.busId, driverId: t.driverId ?? "", conductorId: t.conductorId ?? "", standInConductorId: t.standInConductorId ?? "", hostessName: t.hostessName ?? "" },
          onSubmit: (b) => act(() => adminApi.tripAssign(t.id, b), "Crew saved").then((ok) => (ok && trips.reload(), ok)),
        });

  const addTrip = () =>
    openForm({
      title: "Add a one-off trip",
      note: "For regular departures use Schedules & trips instead. Times are Pakistan time.",
      fields: [
        { name: "routeId", label: "Route", type: "select", numeric: true, required: true, options: routes.filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name })) },
        { name: "busId", label: "Bus", type: "select", numeric: true, required: true, options: buses.filter((b) => b.isActive).map((b) => ({ value: b.id, label: `${b.registrationNo} · ${b.layoutName}` })) },
        { name: "driverId", label: "Driver", type: "select", numeric: true, options: drivers.filter((d) => d.isActive && !d.licenseExpired).map((d) => ({ value: d.id, label: d.fullName })) },
        { name: "departureAt", label: "Departs from first stop", type: "datetime", required: true },
      ],
      initial: {},
      submitLabel: "Create trip",
      onSubmit: (b) => act(() => adminApi.createTrip(b), "Trip created").then((ok) => (ok && trips.reload(), ok)),
    });

  return (
    <Page
      title="Trips & boarding"
      intro="Each departure on a day: change its status, see and board passengers, change bus or crew."
      actions={isAdmin && <Btn kind="primary" onClick={addTrip}>+ One-off trip</Btn>}
    >
      <Filters>
        <div>
          <Label htmlFor="t-date">Date</Label>
          <Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value || pkDate())} />
        </div>
        <div>
          <Label htmlFor="t-st">Status</Label>
          <Select id="t-st" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "All" }, ...Object.keys(NEXT).map((s) => ({ value: s, label: s }))]} />
        </div>
        <Btn onClick={() => setDate(pkDate())}>Today</Btn>
        <Btn onClick={() => setDate(pkDate(1))}>Tomorrow</Btn>
        <Btn onClick={trips.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={trips.err} onRetry={trips.reload} />
      <Table
        loading={trips.loading}
        rows={trips.data}
        empty="No trips on this day."
        cols={[
          { key: "d", label: "Departs", render: (r) => <><b>{fmtT(r.departureAt)}</b>{r.delayMinutes ? <><br /><Badge tone="amber">+{r.delayMinutes} min</Badge></> : null}</> },
          { key: "routeName", label: "Route" },
          {
            key: "b",
            label: "Bus / crew",
            render: (r) => (
              <>
                {r.registrationNo}
                <br />
                <span className="text-xs text-mute">Driver: {r.driverName ?? "–"}</span>
                <br />
                {r.conductorName || r.standInConductorName ? (
                  <span className="text-xs text-mute">Conductor: {r.conductorName ?? "–"}{r.standInConductorName ? ` · stand-in ${r.standInConductorName}` : ""}</span>
                ) : (
                  <Badge tone="amber">no conductor</Badge>
                )}
              </>
            ),
          },
          { key: "seatsTaken", label: "Seats taken" },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <>
                <StatusBadge s={r.status} />
                {r.lastLeft && <div className="mt-1 text-xs text-mute">On route: left {r.lastLeft} {fmtT(r.lastLeftAt)}</div>}
              </>
            ),
          },
          {
            key: "a",
            label: "",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <Btn small onClick={() => setManifest(r)}>Passengers</Btn>
                <Link className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" to={`/admin/trip-vouchers/${r.id}`}>Vouchers{r.vouchersGenerated ? ` (${r.vouchersGenerated})` : ""}</Link>
                {isManager && NEXT[r.status].length > 0 && <Btn small onClick={() => changeStatus(r)}>Status…</Btn>}
                {!isManager && r.status === "departed" && me?.terminalId && me.terminalId === r.destinationTerminalId && (
                  <Btn small kind="ok" onClick={() => applyStatus(r, { status: "arrived" })}>Arrived</Btn>
                )}
                {r.roundTripId && isAdmin && <Link className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" to={`/admin/round-trips/${r.roundTripId}`}>Report {r.roundTripId}</Link>}
                {isManager && r.status !== "cancelled" && <Btn small onClick={() => assign(r)}>{done(r) ? "Stand-in" : "Bus & crew"}</Btn>}
              </div>
            ),
          },
        ]}
      />
      {manifest && <ManifestModal trip={manifest} onClose={() => setManifest(null)} />}
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ bookings */

const METHOD_NAME = { cash: "cash", card: "card", jazzcash: "JazzCash", easypaisa: "Easypaisa", bank_transfer: "bank transfer", wallet: "wallet" };

/**
 * Counter cancellation of a paid booking, for a customer standing at the counter. Step 1: confirm the holder
 * (CNIC on file must match, or a code sent by SMS for older bookings without one). Step 2: cancel. The refund is
 * worked out by the cancellation rules: paid in cash, it is handed over now; paid online, it goes to a super
 * admin for approval and back to the card or wallet.
 */
function CounterRefundModal({ id, onClose, onDone }) {
  const q = useLoad(() => adminApi.counterQuote(id), [id]);
  const d = q.data;
  const [cnic, setCnic] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  const fmtCnic = (v) => {
    const x = v.replace(/\D/g, "").slice(0, 13);
    return [x.slice(0, 5), x.slice(5, 12), x.slice(12)].filter(Boolean).join("-");
  };

  async function sendCode() {
    setBusy(true);
    setErr("");
    try {
      setSent(await adminApi.counterCode(id));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await adminApi.counterCancel(id, {
        ...(d.identityCheck === "cnic" ? { cnic } : { code: code.trim() }),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setDone(r);
      onDone();
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  const how = d?.refundHow;
  const ready = d && (d.identityCheck === "cnic" ? /^\d{5}-\d{7}-\d$/.test(cnic) : /^\d{6}$/.test(code.trim()));
  const submitLabel = how === "cash_now" ? `Cancel and pay ${rs(d.refundAmount)} in cash` : "Cancel booking";

  return (
    <Modal title={d ? `Cancel at counter · ${d.pnr}` : "Cancel at counter"} onClose={onClose}>
      <ErrorNote err={q.err} onRetry={q.reload} />
      {!d && !q.err && <p className="text-sm text-mute">Loading…</p>}

      {done && (
        <div className="grid gap-3">
          {done.refundHow === "cash_now" ? (
            <p className="rounded-xl border-2 border-green-600 bg-green-50 p-4 text-lg font-bold text-green-900">
              Give {rs(done.refund.amount)} in cash to the customer now.
            </p>
          ) : done.refundHow === "online_approval" ? (
            <p className="rounded-xl border-2 border-black bg-neutral-100 p-4 text-neutral-900">
              Cancelled. The refund of <b>{rs(done.refund.amount)}</b> was paid online, so it goes back to the customer&apos;s card or wallet after a super admin approves it. Do not give cash.
            </p>
          ) : (
            <p className="rounded-xl border-2 border-black bg-neutral-100 p-4 text-neutral-900">Cancelled. Under the cancellation rules nothing is refunded.</p>
          )}
          <Btn kind="primary" onClick={onClose}>Done</Btn>
        </div>
      )}

      {d && !done && (
        <form onSubmit={submit} className="grid gap-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-neutral-100 p-3 text-sm">
            <div><dt className="text-xs font-bold uppercase text-neutral-500">Paid</dt><dd>{rs(d.paid)} by {METHOD_NAME[d.paidBy] ?? d.paidBy}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-neutral-500">Before departure</dt><dd>{d.hoursBeforeDeparture} hours</dd></div>
            <div><dt className="text-xs font-bold uppercase text-neutral-500">Refund ({d.refundPercent}%)</dt><dd className="text-lg font-extrabold">{rs(d.refundAmount)}</dd></div>
            <div><dt className="text-xs font-bold uppercase text-neutral-500">Fee kept</dt><dd>{rs(d.cancellationFee)}</dd></div>
          </dl>
          <p className="text-sm text-neutral-800">
            {how === "cash_now" && <>Paid in cash, so the refund is <b>paid in cash here, now</b>. The amount comes from the cancellation rules and cannot be changed.</>}
            {how === "online_approval" && <>Paid online ({METHOD_NAME[d.paidBy] ?? d.paidBy}), so <b>no cash is given</b>. The booking is cancelled now and the refund goes back to the customer&apos;s card or wallet after a super admin approves it.</>}
            {how === "none" && <>Under the cancellation rules nothing is refunded. The booking is still cancelled and the seats released.</>}
          </p>

          <div className="rounded-xl border-2 border-black p-3">
            <p className="font-bold text-black">1. Confirm the customer is the booking holder</p>
            {d.identityCheck === "cnic" ? (
              <div className="mt-2">
                <Label htmlFor="cr-cnic">Customer&apos;s CNIC (ask to see the card)</Label>
                <Input id="cr-cnic" inputMode="numeric" autoComplete="off" placeholder="35202-1234567-1" value={cnic} onChange={(e) => setCnic(fmtCnic(e.target.value))} />
                <p className="mt-1 text-xs text-mute">On the booking: {d.holderCnicMasked}. The full number must match.</p>
              </div>
            ) : (
              <div className="mt-2 grid gap-2">
                <p className="text-sm text-neutral-800">This booking has no CNIC. Send a code to the booking&apos;s phone ({d.phoneMasked}) and ask the customer for it.</p>
                <div><Btn type="button" small onClick={sendCode} disabled={busy}>{sent ? "Send a new code" : "Send code by SMS"}</Btn></div>
                {sent && <p className="text-xs text-mute">Sent to {sent.sentTo}. Valid for {sent.expiresInMinutes} minutes.</p>}
                {sent?.devCode && (
                  <p className="rounded-lg border border-amber-400 bg-amber-50 p-2 text-xs text-amber-900">
                    No SMS service is set up yet (development), so the code is shown here for testing: <b className="font-mono">{sent.devCode}</b>
                  </p>
                )}
                <Label htmlFor="cr-code">Code from the customer&apos;s phone</Label>
                <Input id="cr-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="cr-reason">Note (optional)</Label>
            <Input id="cr-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer changed plans" />
          </div>

          {err && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Btn kind="danger" type="submit" disabled={!ready || busy}>{busy ? "Working…" : `2. ${submitLabel}`}</Btn>
            <Btn type="button" onClick={onClose}>Go back</Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}

function BookingModal({ id, onClose, onChanged, isAdmin }) {
  const b = useLoad(() => adminApi.booking(id), [id]);
  const [ask, confirmNode] = useConfirm();
  const [openForm, form] = useForm();
  const [counter, setCounter] = useState(false);
  const d = b.data;

  async function cancel() {
    let quote = null;
    try {
      quote = await adminApi.cancelQuote(id);
    } catch {
      // still allow cancelling; the server applies the rules anyway
    }
    const body = quote
      ? `Paid ${rs(quote.paid)}. ${quote.hoursBeforeDeparture} hours before departure: refund ${quote.refundPercent}% = ${rs(quote.refundAmount)}, fee ${rs(quote.cancellationFee)}. The seats are released now; the refund goes to the Refunds list.`
      : "The seats are released now.";
    if (!(await ask(`Cancel ${d.pnr}?`, body, { confirm: "Cancel booking" }))) return;
    if (await act(() => adminApi.cancelBooking(id, "Cancelled by staff"), "Booking cancelled")) {
      b.reload();
      onChanged();
    }
  }

  const cash = () =>
    openForm({
      title: `Cash received · ${d.pnr}`,
      note: "Records cash taken at the counter and confirms the booking at once. The amount must equal the booking total.",
      fields: [{ name: "amount", label: "Amount received (Rs)", type: "number", required: true, min: 0 }],
      initial: { amount: d.totalAmount },
      submitLabel: "Confirm booking",
      onSubmit: ({ amount }) =>
        act(() => adminApi.cashPayment(id, amount), "Paid in cash", "Booking confirmed").then((ok) => {
          if (ok) {
            b.reload();
            onChanged();
          }
          return ok;
        }),
    });

  return (
    <Modal wide title={d ? `Booking ${d.pnr}` : "Booking"} onClose={onClose}>
      <ErrorNote err={b.err} onRetry={b.reload} />
      {!d ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge s={d.status} />
            <Badge>{d.channel}</Badge>
            <span className="text-sm text-mute">Made {fmtDT(d.createdAt)}</span>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Journey", `${d.boardingTerminal} → ${d.droppingTerminal}`],
              ["Route", d.routeName],
              ["Boards at", fmtDT(d.boardingAt)],
              ["Trip status", d.tripStatus],
              ["Contact", `${d.contactName} · ${d.contactPhone}${d.contactEmail ? ` · ${d.contactEmail}` : ""}`],
              ["Holder CNIC", d.holderCnicMasked ?? "Not on file (an SMS code is used for counter refunds)"],
              ["Total", `${rs(d.totalAmount)}${Number(d.discountAmount) ? ` (discount ${rs(d.discountAmount)})` : ""}`],
              ...(d.status === "pending" ? [["Hold ends", fmtDT(d.holdExpiresAt)]] : []),
              ...(d.cancelReason ? [["Cancel reason", d.cancelReason]] : []),
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase text-neutral-500">{k}</dt>
                <dd className="text-black">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-2 font-bold">Passengers</h3>
            <Table
              rows={d.tickets}
              cols={[
                { key: "seatNumber", label: "Seat" },
                { key: "passengerName", label: "Name" },
                { key: "passengerGender", label: "Gender" },
                { key: "ticketNo", label: "Ticket" },
                { key: "fareAmount", label: "Fare", render: (r) => rs(r.fareAmount) },
                { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
              ]}
            />
          </div>
          <div>
            <h3 className="mb-2 font-bold">Payments</h3>
            <Table
              rows={d.payments}
              empty="No payment yet."
              cols={[
                { key: "createdAt", label: "Started", render: (r) => fmtDT(r.createdAt) },
                { key: "method", label: "Method" },
                { key: "amount", label: "Amount", render: (r) => rs(r.amount) },
                { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
                { key: "paidAt", label: "Paid", render: (r) => fmtDT(r.paidAt) },
              ]}
            />
          </div>
          {d.refunds?.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold">Refunds</h3>
              <Table
                rows={d.refunds}
                cols={[
                  { key: "createdAt", label: "Created", render: (r) => fmtDT(r.createdAt) },
                  { key: "channel", label: "Where", render: (r) => (r.channel === "counter" ? "Counter (cash)" : "Online") },
                  { key: "amount", label: "Refund", render: (r) => rs(r.amount) },
                  { key: "cancellationFee", label: "Fee kept", render: (r) => rs(r.cancellationFee) },
                  { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
                ]}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {d.status === "pending" && <Btn kind="ok" onClick={cash}>Cash received</Btn>}
            {/* Paid: cancel at the counter with the holder check and the refund. Unpaid: nothing to refund. */}
            {d.status === "confirmed" && ["scheduled", "delayed", "boarding"].includes(d.tripStatus) && (
              <Btn kind="danger" onClick={() => setCounter(true)}>Cancel and refund (customer at counter)</Btn>
            )}
            {d.status === "pending" && (isAdmin || ["scheduled", "delayed", "boarding"].includes(d.tripStatus)) && (
              <Btn kind="danger" onClick={cancel}>Cancel booking</Btn>
            )}
            {d.status === "confirmed" && isAdmin && (
              <Btn onClick={cancel}>Cancel without customer (refund goes for approval)</Btn>
            )}
          </div>
        </div>
      )}
      {counter && (
        <CounterRefundModal
          id={id}
          onClose={() => setCounter(false)}
          onDone={() => {
            b.reload();
            onChanged();
          }}
        />
      )}
      {confirmNode}
      {form}
    </Modal>
  );
}

export function Bookings({ isAdmin }) {
  const [q, setQ] = useState({ pnr: "", phone: "", status: "", page: 1 });
  const [applied, setApplied] = useState({ page: 1 });
  const list = useLoad(() => adminApi.bookings({ ...applied, limit: 25 }), [JSON.stringify(applied)]);
  const [open, setOpen] = useState(null);

  const search = (e) => {
    e?.preventDefault();
    setApplied({ pnr: q.pnr.trim().toUpperCase() || undefined, phone: q.phone.trim() || undefined, status: q.status || undefined, page: 1 });
  };

  return (
    <Page
      title="Bookings"
      intro="Find a booking by reference or phone, see its passengers and payments, take cash at the counter or cancel it. For a walk-in customer, book on the website while signed in as staff and choose Cash received on the payment page."
      actions={<Link to="/en/book" className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm">+ New counter booking</Link>}
    >
      <form onSubmit={search}>
        <Filters>
          <div>
            <Label htmlFor="b-pnr">Reference</Label>
            <Input id="b-pnr" placeholder="NK…" value={q.pnr} onChange={(e) => setQ({ ...q, pnr: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="b-ph">Phone</Label>
            <Input id="b-ph" placeholder="+923001234567" value={q.phone} onChange={(e) => setQ({ ...q, phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="b-st">Status</Label>
            <Select id="b-st" value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value })} options={[{ value: "", label: "All" }, ...["pending", "confirmed", "completed", "cancelled", "expired", "refunded"].map((s) => ({ value: s, label: s }))]} />
          </div>
          <Btn kind="primary" type="submit">Search</Btn>
          <Btn onClick={() => { setQ({ pnr: "", phone: "", status: "", page: 1 }); setApplied({ page: 1 }); }}>Clear</Btn>
        </Filters>
      </form>
      <p className="mb-2 text-xs text-mute">Phone numbers are stored as +92…; 03001234567 is also accepted.</p>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="No bookings match."
        cols={[
          { key: "pnr", label: "Reference", render: (r) => <span className="font-mono font-bold">{r.pnr}</span> },
          { key: "createdAt", label: "Made", render: (r) => fmtDT(r.createdAt) },
          { key: "routeName", label: "Route" },
          { key: "departureAt", label: "Trip departs", render: (r) => fmtDT(r.departureAt) },
          { key: "c", label: "Contact", render: (r) => <>{r.contactName}<br /><span className="text-xs text-mute">{r.contactPhone}</span></> },
          { key: "channel", label: "Channel" },
          { key: "totalAmount", label: "Total", render: (r) => rs(r.totalAmount) },
          { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
          { key: "a", label: "", render: (r) => <Btn small onClick={() => setOpen(r.id)}>Open</Btn> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={(page) => setApplied({ ...applied, page })} />
      {open && <BookingModal id={open} isAdmin={isAdmin} onClose={() => setOpen(null)} onChanged={list.reload} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ refunds */

export function Refunds({ me }) {
  const canDecide = me?.role === "super_admin";
  const [status, setStatus] = useState("requested");
  const [page, setPage] = useState(1);
  const list = useLoad(() => adminApi.refunds({ status: status || undefined, page, limit: 25 }), [status, page]);
  const [openForm, form] = useForm();

  const update = (r, next) =>
    openForm({
      title: `${{ approved: "Approve", rejected: "Reject", processed: "Mark as paid" }[next]} · ${r.pnr}`,
      note:
        next === "processed"
          ? `Send ${rs(r.amount)} back to the customer first (Safepay dashboard for online payments, cash at the counter for cash), then record it here.`
          : next === "approved"
            ? `Approve a refund of ${rs(r.amount)} to ${r.contactName}, as worked out by the cancellation rules (paid ${rs(Number(r.amount) + Number(r.cancellationFee))}, fee kept ${rs(r.cancellationFee)}). The amount cannot be changed: if it looks wrong, reject it and contact the customer. It then waits in "Approved" until the money is sent.`
            : "The customer gets nothing back. Write why.",
      fields: [
        ...(next === "processed" ? [{ name: "gatewayRefundId", label: "Refund reference (from Safepay or receipt no.)", type: "text", hint: "Letters, digits, . _ : - only." }] : []),
        { name: "reason", label: next === "rejected" ? "Reason" : "Note", type: "textarea", required: next === "rejected" },
      ],
      submitLabel: { approved: "Approve", rejected: "Reject refund", processed: "Mark as paid" }[next],
      onSubmit: (b) => act(() => adminApi.updateRefund(r.id, { status: next, ...b }), "Refund updated").then((ok) => (ok && list.reload(), ok)),
    });

  return (
    <Page
      title="Refunds"
      intro="Online refunds (cancelled online, or paid by card or wallet) wait here for a super admin: check the amount the cancellation rules worked out, approve or reject it, send the money back through Safepay, then mark it paid. Cash refunds at a counter are paid on the spot and appear here already paid."
    >
      {!canDecide && (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Only a super admin can approve, reject or mark online refunds as paid. You can see them here.
        </p>
      )}
      <Filters>
        <div>
          <Label htmlFor="r-st">Show</Label>
          <Select
            id="r-st"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: "requested", label: "To review (requested)" },
              { value: "approved", label: "Approved, to pay" },
              { value: "processed", label: "Paid" },
              { value: "rejected", label: "Rejected" },
              { value: "", label: "All" },
            ]}
          />
        </div>
        <Btn onClick={list.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="Nothing in this list."
        cols={[
          { key: "createdAt", label: "Created", render: (r) => fmtDT(r.createdAt) },
          { key: "pnr", label: "Booking", render: (r) => <span className="font-mono font-bold">{r.pnr}</span> },
          { key: "c", label: "Customer", render: (r) => <>{r.contactName}<br /><span className="text-xs text-mute">{r.contactPhone}</span></> },
          { key: "paymentMethod", label: "Paid by" },
          {
            key: "channel",
            label: "Where",
            render: (r) =>
              r.channel === "counter" ? (
                <>
                  Counter, cash
                  <br />
                  <span className="text-xs text-mute">
                    {r.processedByName ?? "staff"} · {r.identityCheck === "sms_code" ? "SMS code" : "CNIC"} checked
                  </span>
                </>
              ) : (
                "Online"
              ),
          },
          { key: "amount", label: "Refund", render: (r) => <b>{rs(r.amount)}</b> },
          { key: "cancellationFee", label: "Fee kept", render: (r) => rs(r.cancellationFee) },
          { key: "reason", label: "Reason", className: "max-w-xs" },
          { key: "status", label: "Status", render: (r) => <StatusBadge s={r.status} /> },
          {
            key: "a",
            label: "",
            render: (r) => canDecide && (
              <div className="flex flex-wrap gap-1">
                {r.status === "requested" && <Btn small kind="primary" onClick={() => update(r, "approved")}>Approve</Btn>}
                {r.status === "approved" && <Btn small kind="ok" onClick={() => update(r, "processed")}>Mark paid</Btn>}
                {["requested", "approved"].includes(r.status) && <Btn small kind="danger" onClick={() => update(r, "rejected")}>Reject</Btn>}
              </div>
            ),
          },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={setPage} />
      {form}
    </Page>
  );
}
