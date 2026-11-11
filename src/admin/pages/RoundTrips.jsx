/**
 * Round Trip Reports (admin and super admin):
 *  - RoundTrips: list and create.            /admin/round-trips
 *  - RoundTripEditor: one trip's legs, terminal vouchers, fuel, off-route lines, finalize, QR tokens.
 *                                             /admin/round-trips/:id
 *  - Vouchers: every terminal voucher.        /admin/vouchers
 *  - OffrouteSettings: categories and default amounts (global and per route).   /admin/offroute
 *  - ReportLists: on-route expense names and online booking platforms.          /admin/report-lists
 *  - VoucherSlip: the printable thermal slip (58 / 80 mm) with the voucher's QR. /admin/slip/:id
 * The server enforces every rule (admin role, finalized = locked); the screens only mirror them.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, Filters, fmtDT, Input, Label, Modal, Page, pkLocalToIso, Section, Select, Table,
  useConfirm, useForm, useLoad,
} from "../ui";
import { Pager } from "./Operations";
import { BUS_CLASSES } from "./Network";
import { departure, dmy, money, plain } from "../../report/format";

/* ------------------------------------------------------------------ helpers */

const TZ = "Asia/Karachi";
/** ISO time → "2026-11-02T22:00" in Pakistan time, for datetime-local inputs. */
const toPkLocal = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T").slice(0, 16) : "");
const int = (v) => (v === "" || v === null || v === undefined ? 0 : Math.max(0, Math.round(Number(v)) || 0));
const reportLink = (token) => (token ? `/r/${token}` : null);

/** Same rounding as the server: round(litres × rate) on 3-decimal inputs. */
export function fuelAmount(litres, rate) {
  const l = Math.round(Number(litres) * 1000);
  const r = Math.round(Number(rate) * 1000);
  if (!Number.isFinite(l) || !Number.isFinite(r) || l < 0 || r < 0) return 0;
  return Number((BigInt(l) * BigInt(r) + 500000n) / 1000000n);
}

const StatusTag = ({ s }) => (s === "finalized" ? <Badge tone="green">Finalized</Badge> : <Badge tone="amber">Draft</Badge>);

function useLists() {
  const buses = useLoad(() => adminApi.buses(), []);
  const drivers = useLoad(() => adminApi.drivers(), []);
  const routes = useLoad(() => adminApi.routes(), []);
  const cashiers = useLoad(() => adminApi.crew("cashier").catch(() => []), []);
  return {
    cashierNames: (cashiers.data ?? []).map((c) => c.fullName),
    err: buses.err || drivers.err || routes.err,
    busOpts: (buses.data ?? []).map((b) => ({ value: b.id, label: `${b.fleetNo ?? b.registrationNo} · ${b.registrationNo}${b.hasHostess ? " · hostess" : ""}` })),
    driverOpts: (drivers.data ?? []).filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.fullName })),
    routeOpts: (routes.data ?? []).map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` })),
    routes: routes.data ?? [],
  };
}

/** Printed route of a round trip, from the chosen route: "Lahore → DI Khan (via …)" → "Lahore ⇄ DI Khan (via …)". */
const routeLabelFor = (routes, id) => {
  const r = routes.find((x) => x.id === Number(id));
  return r ? r.name.replace(/\s*(→|->)\s*/, " ⇄ ").slice(0, 120) : undefined;
};

function tripFields({ busOpts, driverOpts, routeOpts, cashierNames = [] }, { create = false, cashier = null } = {}) {
  // Cashiers registered under Employees; a name typed on an older report stays selectable.
  const cashierOpts = [...cashierNames, ...(cashier && !cashierNames.includes(cashier) ? [cashier] : [])].map((n) => ({ value: n, label: n }));
  return [
    { name: "routeId", label: "Route", type: "select", numeric: true, required: true, options: routeOpts, hint: create ? "Printed on the report as a round trip (e.g. Lahore ⇄ DI Khan). Off-route expenses are filled in from this route's default amounts (or the global ones)." : "Changing it updates the printed route but not the off-route lines already on this report. Use “Apply new defaults” for that." },
    { name: "busId", label: "Bus", type: "select", numeric: true, required: true, options: busOpts },
    { name: "driverId", label: "Driver", type: "select", numeric: true, options: driverOpts, nullable: !create },
    { name: "driverName", label: "Driver name as printed", type: "text", nullable: !create, hint: "Leave blank to print the driver chosen above." },
    { name: "fareCollector", label: "Fare collector", type: "text", nullable: !create },
    { name: "reportDate", label: "Report date", type: "date", required: true },
    { name: "reportTime", label: "Time", type: "time", nullable: !create },
    { name: "distanceKm", label: "Distance (km, whole round trip)", type: "number", min: 0, step: "0.01" },
    ...(create
      ? [
          { name: "leg1", label: "Leg 1", type: "text", placeholder: "Lahore to DIK via Mianwali" },
          { name: "leg2", label: "Leg 2", type: "text", placeholder: "DIK to Lahore via Mianwali" },
        ]
      : [
          { name: "mobilOil", label: "Mobil oil", type: "number", min: 0, step: "0.01" },
          { name: "otherExpense", label: "Other expense (Rs)", type: "number", min: 0, step: 1 },
          { name: "otherExpenseNote", label: "Other expense note", type: "text", nullable: true, placeholder: "KUN 100, Q.ABAD 200" },
          { name: "otherIncome", label: "Other income (Rs)", type: "number", min: 0, step: 1 },
          { name: "otherIncomeNote", label: "Other income note", type: "text", nullable: true },
          { name: "cashierName", label: "Cash received by (cashier)", type: "select", nullable: true, options: cashierOpts, hint: cashierOpts.length ? undefined : "No cashiers registered yet: add them under Employees (designation Cashier)." },
          { name: "cashReceivedAt", label: "Cash received at", type: "datetime", nullable: true },
          { name: "inchargeName", label: "Incharge", type: "text", nullable: true },
        ]),
  ];
}

/* ------------------------------------------------------------------ list */

export function RoundTrips() {
  const navigate = useNavigate();
  const [f, setF] = useState({ status: "", q: "", page: 1 });
  const list = useLoad(() => adminApi.roundTrips({ status: f.status || undefined, q: f.q || undefined, page: f.page, limit: 25 }), [f]);
  const lists = useLists();
  const [openForm, form] = useForm();
  const [q, setQ] = useState("");

  const [fromTrips, setFromTrips] = useState(false);
  const scan = async () => {
    let res;
    const ok = await act(async () => { res = await adminApi.scanCompletedRoundTrips(); });
    if (!ok) return;
    const n = res.made.length;
    act(async () => {}, n ? `${n} report${n === 1 ? "" : "s"} created` : "Nothing new", n ? "Buses that came back to Lahore or Multan now have their draft reports." : "Every bus that came back to Lahore or Multan already has a report.");
    if (n) list.reload();
  };
  const create = () =>
    openForm({
      title: "Blank round trip report (everything typed in)",
      fields: tripFields(lists, { create: true }),
      initial: { reportDate: new Date().toLocaleDateString("en-CA", { timeZone: TZ }) },
      submitLabel: "Create report",
      onSubmit: async (b) => {
        const { leg1, leg2, ...rest } = b;
        rest.routeLabel = routeLabelFor(lists.routes, rest.routeId);
        const legs = [leg1, leg2].filter(Boolean).map((title) => ({ title }));
        let made;
        const ok = await act(async () => { made = await adminApi.createRoundTrip({ ...rest, legs }); }, "Report created", "Off-route expenses were filled in from the defaults.");
        if (ok) navigate(`/admin/round-trips/${made.trip.id}`);
        return ok;
      },
    });

  return (
    <Page
      title="Round trip reports"
      intro="Income and expenses of each bus round trip. When a bus arrives back at Lahore or Multan, its report is made automatically from its trips and vouchers. Open it to add diesel, E-tag and the other expenses, then finalize it."
      actions={
        <>
          <Btn kind="primary" onClick={() => setFromTrips(true)}>+ New report from trips</Btn>
          <Btn onClick={create}>+ Blank report</Btn>
          <Btn onClick={scan}>Find completed round trips</Btn>
        </>
      }
    >
      <Filters>
        <div>
          <Label htmlFor="rt-s">Status</Label>
          <Select id="rt-s" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} options={[{ value: "", label: "All" }, { value: "draft", label: "Draft" }, { value: "finalized", label: "Finalized" }]} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), page: 1 }); }} className="flex items-end gap-2">
          <div>
            <Label htmlFor="rt-q">Report ID, fleet no., route or voucher no.</Label>
            <Input id="rt-q" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Btn type="submit">Search</Btn>
        </form>
      </Filters>
      <ErrorNote err={list.err || lists.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="No round trip reports yet."
        cols={[
          { key: "id", label: "Report ID", render: (r) => <Link to={`/admin/round-trips/${r.id}`} className="font-bold">{r.id}</Link> },
          { key: "reportDate", label: "Date", render: (r) => dmy(r.reportDate) },
          {
            key: "routeLabel",
            label: "Route",
            render: (r) => (
              <>
                {r.routeLabel}
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="text-mute">{r.legs} leg{r.legs === 1 ? "" : "s"}</span>
                  {r.autoCreated && <Badge tone="blue">made automatically</Badge>}
                </div>
              </>
            ),
          },
          { key: "fleetNo", label: "Bus" },
          { key: "voucherCount", label: "Vouchers" },
          { key: "status", label: "Status", render: (r) => <StatusTag s={r.status} /> },
          { key: "updatedAt", label: "Last updated", render: (r) => fmtDT(r.updatedAt) },
          { key: "a", label: "", render: (r) => <Btn small onClick={() => navigate(`/admin/round-trips/${r.id}`)}>Open</Btn> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={(page) => setF({ ...f, page })} />
      {form}
      {fromTrips && <FromTripsModal onClose={() => setFromTrips(false)} onMade={(id) => navigate(`/admin/round-trips/${id}`)} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ new report from trips */

/** Pick the outbound trip and the return trip of one bus; the report fills itself in from them and their vouchers. */
function FromTripsModal({ onClose, onMade }) {
  const opts = useLoad(() => adminApi.roundTripOptions({}), []);
  const [outId, setOutId] = useState("");
  const [backId, setBackId] = useState("");
  const [busy, setBusy] = useState(false);
  const trips = opts.data ?? [];
  const label = (t) => `${t.routeName} · ${departure(t.departureAt)} · ${t.bus} · ${t.vouchers} voucher${t.vouchers === 1 ? "" : "s"}${t.inReport ? ` · in report ${t.inReport}` : ""}`;
  const out = trips.find((t) => String(t.id) === outId);
  // Return trips: same bus, leaving after the outbound trip; trips going back to where the outbound started first.
  const backs = out
    ? trips
        .filter((t) => t.busId === out.busId && new Date(t.departureAt) > new Date(out.departureAt))
        .sort((a, b) => (b.originTerminalId === out.destinationTerminalId) - (a.originTerminalId === out.destinationTerminalId) || new Date(a.departureAt) - new Date(b.departureAt))
    : [];
  useEffect(() => {
    const first = backs.find((t) => !t.inReport && t.originTerminalId === out?.destinationTerminalId);
    setBackId(first ? String(first.id) : "");
  }, [outId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    let made;
    const ok = await act(async () => {
      made = await adminApi.createRoundTripFromTrips({ outboundTripId: Number(outId), returnTripId: backId ? Number(backId) : null });
    }, "Report created", "Filled in from the trips and their terminal vouchers.");
    setBusy(false);
    if (ok) onMade(made.data.trip.id);
  }

  return (
    <Modal title="New round trip report from trips" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4">
        <p className="rounded-xl bg-neutral-100 p-3 text-sm">
          Filled in automatically: bus, driver, conductor, date, route, distance, and one row per terminal voucher (passengers, terminal cash,
          online sale, road passengers, load, cargo, terminal deductions), plus the off-route defaults. You then add diesel, E-tag / toll tax,
          mobil oil, other expense and income, and the cashier.
        </p>
        <ErrorNote err={opts.err} onRetry={opts.reload} />
        <div>
          <Label htmlFor="ft-out">Outbound trip *</Label>
          <Select id="ft-out" required value={outId} onChange={(e) => setOutId(e.target.value)}
            options={[{ value: "", label: opts.loading ? "Loading…" : "— choose —" }, ...trips.filter((t) => !t.inReport).map((t) => ({ value: String(t.id), label: label(t) }))]} />
          <p className="mt-1 text-xs text-mute">Trips from the last 10 days and the next 2. Trips already in a report are not listed.</p>
        </div>
        <div>
          <Label htmlFor="ft-back">Return trip (same bus)</Label>
          <Select id="ft-back" value={backId} onChange={(e) => setBackId(e.target.value)} disabled={!out}
            options={[{ value: "", label: out ? "— no return trip (one way) —" : "Choose the outbound trip first" }, ...backs.filter((t) => !t.inReport).map((t) => ({ value: String(t.id), label: label(t) }))]} />
          {out && backs.length === 0 && <p className="mt-1 text-xs text-mute">No later trips on bus {out.bus} yet.</p>}
        </div>
        <div className="flex gap-2">
          <Btn kind="primary" type="submit" disabled={busy || !outId}>{busy ? "Creating…" : "Create report"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ editor */

export function RoundTripEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const rt = useLoad(() => adminApi.roundTrip(id), [id]);
  const lists = useLists();
  const onroute = useLoad(() => adminApi.reportList("onroute"), []);
  const platforms = useLoad(() => adminApi.reportList("platforms"), []);
  const locations = useLoad(() => adminApi.locations(), []);
  const [openForm, form] = useForm();
  const [ask, confirmNode] = useConfirm();
  const [voucher, setVoucher] = useState(null); // { legId, v? }
  const [preview, setPreview] = useState(null);
  const [showScans, setShowScans] = useState(false);
  // Terminals of the report's trips that have not generated their voucher yet (reports built from trips).
  const missing = useLoad(() => adminApi.missingRoundTripVouchers(id), [id, rt.data?.trip.updatedAt]);

  const r = rt.data;
  const locked = r?.trip.status === "finalized";
  /** Runs a change and shows the report the server sends back. */
  const run = (fn, ok) => act(async () => { const d = await fn(); if (d?.trip) rt.setData(d); else await rt.reload(); }, ok);

  if (rt.err) return <Page title="Round trip report"><ErrorNote err={rt.err} onRetry={rt.reload} /></Page>;
  if (!r) return <Page title="Round trip report"><p className="text-sm text-mute">Loading…</p></Page>;
  const { trip, edit, summary } = r;

  const editDetails = () =>
    openForm({
      title: `Edit report ${trip.id}`,
      fields: tripFields(lists, { cashier: trip.cashierName }),
      initial: {
        ...trip,
        routeId: trip.routeId ?? "", driverId: trip.driverId ?? "", driverName: edit.driverName ?? "", fareCollector: trip.fareCollector ?? "",
        reportTime: trip.reportTime ?? "", otherExpenseNote: trip.otherExpenseNote ?? "", otherIncomeNote: trip.otherIncomeNote ?? "",
        cashierName: trip.cashierName ?? "", inchargeName: trip.inchargeName ?? "", cashReceivedAt: toPkLocal(trip.cashReceivedAt),
      },
      onSubmit: (b) => {
        const body = b.routeId !== trip.routeId ? { ...b, routeLabel: routeLabelFor(lists.routes, b.routeId) } : b;
        return run(() => adminApi.updateRoundTrip(trip.id, body), "Report saved");
      },
    });

  const finalize = async () => {
    if (!(await ask("Finalize this report?", `Cash deposit Rs ${money(summary.cashDeposit)}. After finalizing, nothing on this report can be changed, and changing default rates will never affect it.`, { danger: false, confirm: "Finalize" }))) return;
    run(() => adminApi.finalizeRoundTrip(trip.id), "Report finalized");
  };
  const remove = async () => {
    if (!(await ask("Delete this draft report?", "Its vouchers are deleted too. Their numbers are not reused."))) return;
    if (await act(() => adminApi.deleteRoundTrip(trip.id), "Report deleted")) navigate("/admin/round-trips");
  };
  const newQr = async (voucherId, label) => {
    if (!(await ask(`Replace the QR code of ${label}?`, "The old QR code stops working at once (it shows “link not valid”). Print the slip again to get the new one."))) return;
    run(() => adminApi.regenerateToken(trip.id, voucherId), "New QR code made");
  };
  const fromTrips = edit.legs.some((l) => l.tripId);
  const syncVouchers = async (includeEdited) => {
    if (includeEdited && !(await ask("Replace rows changed by hand too?", "Every row copied from a terminal voucher goes back to the voucher's figures, including rows you changed by hand.", { confirm: "Replace all" }))) return;
    let res;
    const ok = await act(async () => {
      res = await adminApi.syncRoundTripVouchers(trip.id, includeEdited);
      rt.setData(res.data);
    }, "Updated from vouchers");
    if (ok && res?.sync) {
      const s2 = res.sync;
      act(async () => {}, `${s2.added} added · ${s2.updated} updated · ${s2.removed} removed`, s2.keptEdited ? `${s2.keptEdited} row(s) changed by hand were kept.` : "");
    }
  };
  const openPreview = async () => {
    try {
      setPreview({ changes: await adminApi.defaultsPreview(trip.id), include: [] });
    } catch (e) {
      act(() => Promise.reject(e));
    }
  };

  return (
    <Page
      title={`Round trip report ${trip.id}`}
      intro={`${trip.routeLabel} · ${dmy(trip.reportDate)} · bus ${trip.fleetNo ?? "–"} · last updated ${fmtDT(trip.updatedAt)}`}
      actions={
        <>
          <StatusTag s={trip.status} />
          {edit.headerToken && <a className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm" href={reportLink(edit.headerToken)} target="_blank" rel="noreferrer">Open report / PDF</a>}
          {!locked && <Btn onClick={editDetails}>Edit details</Btn>}
          {!locked && <Btn kind="ok" onClick={finalize}>Finalize</Btn>}
          {!locked && <Btn kind="danger" onClick={remove}>Delete</Btn>}
        </>
      }
    >
      <Link to="/admin/round-trips" className="text-sm">‹ All reports</Link>
      {locked && (
        <p className="mt-3 rounded-xl border border-green-600 bg-green-50 p-3 text-sm text-green-900">
          Finalized {fmtDT(trip.finalizedAt)}{trip.finalizedByName ? ` by ${trip.finalizedByName}` : ""}. This report can no longer be changed.
        </p>
      )}

      {/* Figures */}
      <Section title="Figures">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total sale (A)", summary.incomeSub], ["Income net (C)", summary.incomeNet], ["Expense net (F)", summary.expenseNet],
            ["Profit (C − F)", summary.profitNet], ["Online sale (G)", summary.lessOnline], ["Cash deposit", summary.cashDeposit],
            ["Passengers", null, r.totals.paxAll], ["Average", null, r.totals.avgKm === null ? "–" : `${r.totals.avgKm.toFixed(2)} km/L`],
          ].map(([label, n, text]) => (
            <div key={label} className="rounded-xl border border-neutral-300 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
              <p className="mt-1 text-xl font-extrabold">{text ?? `Rs ${money(n)}`}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-mute">
          Diesel Rs {money(r.expenses.diesel)} · on route Rs {money(r.expenses.onroute)} · off route Rs {money(r.expenses.offroute)} · other expense Rs {money(trip.otherExpense)} · cargo/load Rs {money(r.totals.cargoLoad)}
        </p>
      </Section>

      {fromTrips && (missing.data?.length > 0) && (
        <p className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
          <b>Not ready to finalize:</b> these terminals have not generated their voucher yet: {missing.data.map((m) => m.city).join(", ")}.
          Generate them under Operations → Vouchers, then click “Update from vouchers”.
        </p>
      )}

      {/* Legs and vouchers */}
      <Section
        title="Terminal vouchers"
        actions={!locked && (
          <>
            {fromTrips && <Btn small kind="primary" onClick={() => syncVouchers(false)}>Update from vouchers</Btn>}
            {fromTrips && edit.vouchers.some((v) => v.editedAfterSync) && <Btn small onClick={() => syncVouchers(true)}>Update all (replace hand changes)</Btn>}
            {edit.legs.length < 12 && <Btn small onClick={() => openForm({
            title: "Add a leg",
            fields: [{ name: "title", label: "Leg title", type: "text", required: true, placeholder: "DIK to Lahore via Mianwali" }, { name: "legRef", label: "Leg reference (optional)", type: "text", hint: "Only if the business still uses one shared paper number for the leg." }],
            onSubmit: (b) => run(() => adminApi.addLeg(trip.id, b), "Leg added"),
          })}>+ Add leg</Btn>}
          </>
        )}
      >
        {fromTrips && (
          <p className="mb-3 text-sm text-mute">
            Rows marked “from voucher” are copied from the terminal vouchers of the trips (passengers, terminal cash, online sale, road
            passengers, load, cargo, deductions). Changing one by hand marks it “edited”; “Update from vouchers” then leaves it alone.
          </p>
        )}
        {edit.legs.length === 0 && <p className="text-sm text-mute">Add a leg first (e.g. “Lahore to DIK via Mianwali”).</p>}
        {r.legs.map((leg) => {
          const legEdit = edit.legs.find((l) => l.id === leg.id);
          const vouchers = edit.vouchers.filter((v) => v.legId === leg.id);
          return (
            <div key={leg.id} className="mt-4 first:mt-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  Leg {leg.legNo}: {leg.title} <span className="font-normal text-mute">· {leg.rows.length} terminals · {leg.passengers} passengers{leg.legRef ? ` · ref ${leg.legRef}` : ""}</span>
                  {legEdit?.tripId && (
                    <Link to={`/admin/trip-vouchers/${legEdit.tripId}`} className="ms-2 text-sm font-normal">
                      Trip {legEdit.tripId} · {departure(legEdit.tripDepartureAt)} · {legEdit.tripStatus}
                    </Link>
                  )}
                </h3>
                {!locked && (
                  <div className="flex gap-2">
                    <Btn small kind="primary" onClick={() => setVoucher({ legId: leg.id })}>+ Voucher</Btn>
                    <Btn small onClick={() => openForm({
                      title: `Edit leg ${leg.legNo}`,
                      fields: [{ name: "title", label: "Leg title", type: "text", required: true }, { name: "legRef", label: "Leg reference", type: "text", nullable: true }],
                      initial: { title: legEdit.title, legRef: legEdit.legRef ?? "" },
                      onSubmit: (b) => run(() => adminApi.updateLeg(trip.id, leg.id, b), "Leg saved"),
                    })}>Edit leg</Btn>
                    {vouchers.length === 0 && <Btn small kind="danger" onClick={() => run(() => adminApi.deleteLeg(trip.id, leg.id), "Leg removed")}>Remove leg</Btn>}
                  </div>
                )}
              </div>
              <Table
                rows={leg.rows}
                rowKey={(x) => x.voucherId}
                empty="No vouchers on this leg yet."
                cols={[
                  {
                    key: "voucherNo",
                    label: "Voucher no.",
                    render: (x) => {
                      const v = vouchers.find((y) => y.id === x.voucherId);
                      return (
                        <>
                          <b className="font-mono">{x.voucherNo}</b>
                          {x.fromVoucher && <div className="mt-1 flex flex-wrap gap-1"><Badge tone="blue">from voucher</Badge>{v?.editedAfterSync && <Badge tone="amber">edited</Badge>}</div>}
                        </>
                      );
                    },
                  },
                  { key: "terminal", label: "Terminal" },
                  { key: "departureAt", label: "Departure", render: (x) => departure(x.departureAt) },
                  { key: "pax", label: "Pax (term. / en route)", render: (x) => `${x.paxTerminal} / ${x.paxEnroute}` },
                  { key: "inc", label: "Income (term. / en route / online)", render: (x) => `${money(x.incTerminal)} / ${money(x.incEnroute)} / ${money(x.incOnline)}` },
                  { key: "totalSale", label: "Total sale", className: "text-right", render: (x) => <b>{money(x.totalSale)}</b> },
                  {
                    key: "a",
                    label: "",
                    render: (x) => {
                      const v = vouchers.find((y) => y.id === x.voucherId);
                      return (
                        <div className="flex flex-wrap gap-1">
                          <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/slip/${x.voucherId}`} target="_blank" rel="noreferrer">Slip</a>
                          {v?.url && <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={reportLink(v.token)} target="_blank" rel="noreferrer">QR page</a>}
                          {!locked && <Btn small onClick={() => setVoucher({ legId: leg.id, v })}>Edit</Btn>}
                          <Btn small onClick={() => newQr(x.voucherId, `voucher ${x.voucherNo}`)}>New QR</Btn>
                          {!locked && !x.fromVoucher && (
                            <Btn small kind="danger" onClick={async () => {
                              if (await ask(`Delete voucher ${x.voucherNo}?`, "Its number will not be reused and its QR code stops working.")) run(() => adminApi.deleteVoucher(trip.id, x.voucherId), "Voucher deleted");
                            }}>Delete</Btn>
                          )}
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          );
        })}
      </Section>

      <FuelSection key={`fuel-${trip.updatedAt}`} trip={trip} fuel={edit.fuel} locked={locked} onSave={(entries) => run(() => adminApi.saveFuel(trip.id, entries), "Diesel saved")} />

      {/* Off-route lines */}
      <Section
        title="Off-route expenses"
        actions={!locked && (
          <>
            <Btn small onClick={() => openForm({
              title: "Add an off-route line",
              note: "For amounts entered after the trip, such as E-tag / toll tax.",
              fields: [
                { name: "name", label: "Expense", type: "text", required: true, placeholder: "E-tag / toll tax" },
                { name: "amount", label: "Amount (Rs)", type: "number", required: true, min: 0, step: 1 },
              ],
              initial: { name: "E-tag / toll tax" },
              onSubmit: (b) => run(() => adminApi.addOffrouteLine(trip.id, { name: b.name, amount: int(b.amount) }), "Line added"),
            })}>+ Add line</Btn>
            <Btn small onClick={openPreview}>Apply new defaults…</Btn>
          </>
        )}
      >
        <p className="mb-3 text-sm text-mute">
          Copied from the default rates when this report was created; later changes to the defaults do not change it. Only admins can change an amount here. Changed amounts are marked.
        </p>
        <Table
          rows={edit.offroute}
          empty="No off-route expenses on this report."
          cols={[
            { key: "name", label: "Expense", render: (l) => <b>{l.name}</b> },
            { key: "amount", label: "Amount", className: "text-right", render: (l) => `Rs ${money(l.amount)}` },
            { key: "defaultAmount", label: "Default", className: "text-right", render: (l) => `Rs ${money(l.defaultAmount)}` },
            { key: "o", label: "", render: (l) => (l.isOverridden ? <Badge tone="amber">Changed{l.overriddenByName ? ` by ${l.overriddenByName}` : ""} · {fmtDT(l.overriddenAt)}</Badge> : l.amount === 0 ? <Badge>not printed (0)</Badge> : null) },
            {
              key: "a",
              label: "",
              render: (l) => !locked && (
                <div className="flex gap-1">
                  <Btn small onClick={() => openForm({
                    title: `Amount for ${l.name}`,
                    fields: [{ name: "amount", label: "Amount (Rs)", type: "number", required: true, min: 0, step: 1, hint: `Default on this report: Rs ${money(l.defaultAmount)}` }],
                    initial: { amount: l.amount },
                    onSubmit: (b) => run(() => adminApi.setOffrouteLine(trip.id, l.id, { amount: int(b.amount) }), "Amount saved"),
                  })}>Change</Btn>
                  {l.isOverridden && <Btn small onClick={() => run(() => adminApi.setOffrouteLine(trip.id, l.id, { reset: true }), "Back to default")}>Reset</Btn>}
                  {l.categoryId === null && <Btn small kind="danger" onClick={() => run(() => adminApi.removeOffrouteLine(trip.id, l.id), "Line removed")}>Remove</Btn>}
                </div>
              ),
            },
          ]}
        />
      </Section>

      <Section title="QR codes and scans" actions={<Btn small onClick={() => setShowScans((s) => !s)}>{showScans ? "Hide scans" : "Show scans"}</Btn>}>
        <p className="text-sm text-mute">
          Each voucher has its own QR code; the report header has one too. Scanning opens the live report{` `}
          (staff must sign in). Replacing a QR code makes the old one stop working at once.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn small onClick={() => newQr(null, "the report header")}>New header QR</Btn>
        </div>
        {showScans && <Scans id={trip.id} />}
      </Section>

      {voucher && (
        <VoucherModal
          legs={edit.legs}
          start={voucher}
          terminals={locations.data?.terminals ?? []}
          onroute={(onroute.data ?? []).filter((c) => c.isActive)}
          platforms={(platforms.data ?? []).filter((p) => p.isActive)}
          onClose={() => setVoucher(null)}
          onSave={async (body) => {
            let created;
            const ok = await act(async () => {
              if (voucher.v) rt.setData(await adminApi.updateVoucher(trip.id, voucher.v.id, body));
              else {
                const res = await adminApi.addVoucher(trip.id, body);
                created = res.voucher;
                rt.setData(res.data);
              }
            }, voucher.v ? "Voucher saved" : "Voucher created");
            if (ok && created) act(async () => {}, `Voucher no. ${created.voucherNo}`, "Print its slip from the Slip button.");
            return ok;
          }}
        />
      )}
      {preview && (
        <Modal title="Apply new default rates" onClose={() => setPreview(null)} wide>
          {preview.changes.length === 0 ? (
            <p>This report already matches the current defaults.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-mute">Lines changed by hand are kept unless you tick them.</p>
              <Table
                rows={preview.changes}
                rowKey={(c) => `${c.kind}-${c.lineId ?? c.categoryId}`}
                cols={[
                  { key: "name", label: "Expense", render: (c) => <b>{c.name}</b> },
                  { key: "kind", label: "Change", render: (c) => ({ add: "added", change: "new amount", remove: "removed (not a default any more)" })[c.kind] },
                  { key: "from", label: "Now", render: (c) => (c.from === null ? "–" : `Rs ${money(c.from)}`) },
                  { key: "to", label: "After", render: (c) => (c.to === null ? "–" : `Rs ${money(c.to)}`) },
                  {
                    key: "o",
                    label: "",
                    render: (c) => c.isOverridden && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-black" checked={preview.include.includes(c.lineId)}
                          onChange={(e) => setPreview((p) => ({ ...p, include: e.target.checked ? [...p.include, c.lineId] : p.include.filter((x) => x !== c.lineId) }))} />
                        changed by hand: replace too
                      </label>
                    ),
                  },
                ]}
              />
              <div className="mt-4 flex gap-2">
                <Btn kind="primary" onClick={async () => {
                  if (await act(async () => rt.setData((await adminApi.applyDefaults(trip.id, preview.include)).data), "Defaults applied")) setPreview(null);
                }}>Apply</Btn>
                <Btn onClick={() => setPreview(null)}>Cancel</Btn>
              </div>
            </>
          )}
        </Modal>
      )}
      {form}
      {confirmNode}
    </Page>
  );
}

function Scans({ id }) {
  const scans = useLoad(() => adminApi.reportScans(id), [id]);
  return (
    <div className="mt-3">
      <ErrorNote err={scans.err} onRetry={scans.reload} />
      <Table
        loading={scans.loading}
        rows={scans.data}
        rowKey={(s) => `${s.scannedAt}-${s.voucherId}`}
        empty="Nobody has scanned these QR codes yet."
        cols={[
          { key: "scannedAt", label: "When", render: (s) => fmtDT(s.scannedAt) },
          { key: "voucherNo", label: "QR", render: (s) => (s.voucherNo ? `Voucher ${s.voucherNo}` : "Report header") },
          { key: "userName", label: "Signed in as", render: (s) => s.userName ?? "not signed in" },
          { key: "ip", label: "IP" },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ fuel */

function FuelSection({ fuel, locked, onSave }) {
  const blank = { station: "", litres: "", rate: "", amount: "", manual: false };
  const [rows, setRows] = useState(() => (fuel.length ? fuel.map((f) => ({ station: f.station, litres: String(f.litres), rate: String(f.rate), amount: String(f.amount), manual: f.amount !== fuelAmount(f.litres, f.rate) })) : []));
  const [busy, setBusy] = useState(false);
  const set = (i, k, v) =>
    setRows((rs) => rs.map((r, j) => {
      if (j !== i) return r;
      const n = { ...r, [k]: v };
      if (k === "amount") n.manual = true;
      if ((k === "litres" || k === "rate") && !n.manual) n.amount = n.litres && n.rate ? String(fuelAmount(n.litres, n.rate)) : "";
      return n;
    }));
  const total = rows.reduce((s, r) => s + int(r.amount), 0);
  const litres = rows.reduce((s, r) => s + (Number(r.litres) || 0), 0);

  const save = async () => {
    for (const r of rows) {
      if (!r.station.trim() || !(Number(r.litres) > 0) || r.rate === "") {
        act(() => Promise.reject(new Error("Each fuel entry needs a station, litres (more than 0) and a rate.")));
        return;
      }
    }
    setBusy(true);
    await onSave(rows.map((r) => ({ station: r.station.trim(), litres: Number(r.litres), rate: Number(r.rate), amount: r.amount === "" ? undefined : int(r.amount) })));
    setBusy(false);
  };

  return (
    <Section title="Diesel" actions={!locked && <Btn small onClick={() => setRows((rs) => [...rs, blank])}>+ Fuel entry</Btn>}>
      <p className="mb-3 text-sm text-mute">
        Typing litres and rate fills in the amount (litres × rate, rounded). You can type the billed amount instead. Printed as “LHR 259.77 L @ 397.658 … 103,300”.
      </p>
      {rows.length === 0 && <p className="text-sm text-mute">No fuel entered yet.</p>}
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
            <div><Label htmlFor={`fs-${i}`}>Station</Label><Input id={`fs-${i}`} disabled={locked} value={r.station} maxLength={30} placeholder="LHR" onChange={(e) => set(i, "station", e.target.value)} /></div>
            <div><Label htmlFor={`fl-${i}`}>Litres</Label><Input id={`fl-${i}`} disabled={locked} type="number" min="0" step="0.001" value={r.litres} onChange={(e) => set(i, "litres", e.target.value)} /></div>
            <div><Label htmlFor={`fr-${i}`}>Rate / litre</Label><Input id={`fr-${i}`} disabled={locked} type="number" min="0" step="0.001" value={r.rate} onChange={(e) => set(i, "rate", e.target.value)} /></div>
            <div>
              <Label htmlFor={`fa-${i}`}>Amount (Rs)</Label>
              <Input id={`fa-${i}`} disabled={locked} type="number" min="0" step="1" value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} />
              {r.manual && !locked && r.litres && r.rate && int(r.amount) !== fuelAmount(r.litres, r.rate) && (
                <button type="button" className="mt-1 text-xs underline" onClick={() => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, manual: false, amount: String(fuelAmount(x.litres, x.rate)) } : x)))}>
                  Use calculated Rs {money(fuelAmount(r.litres, r.rate))}
                </button>
              )}
            </div>
            {!locked && <Btn small kind="danger" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>Remove</Btn>}
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <p className="mt-3 text-sm">
          Total <b>{plain(Math.round(litres * 1000) / 1000)} L · Rs {money(total)}</b>
        </p>
      )}
      {!locked && <div className="mt-3"><Btn kind="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save diesel"}</Btn></div>}
    </Section>
  );
}

/* ------------------------------------------------------------------ voucher form */

function LinesEditor({ title, rows, setRows, options, kind }) {
  const add = () => setRows([...rows, kind === "online" ? { platformId: options[0]?.id ?? "", seats: "", amount: "" } : { categoryId: options[0]?.id ?? "", amount: "" }]);
  const key = kind === "online" ? "platformId" : "categoryId";
  return (
    <fieldset className="rounded-xl border border-neutral-300 p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-wide text-neutral-600">{title}</legend>
      {rows.length === 0 && <p className="text-sm text-mute">None.</p>}
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Select aria-label={kind === "online" ? "Platform" : "Expense"} className="!w-auto min-w-40 flex-1" value={r[key]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [key]: Number(e.target.value) } : x)))} options={options.map((o) => ({ value: o.id, label: o.name }))} />
            {kind === "online" && <Input aria-label="Seats" className="!w-24" type="number" min="0" step="1" placeholder="Seats" value={r.seats} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, seats: e.target.value } : x)))} />}
            <Input aria-label="Amount" className="!w-32" type="number" min="0" step="1" placeholder="Rs" value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            <Btn small kind="danger" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</Btn>
          </div>
        ))}
      </div>
      <Btn small className="mt-2" onClick={add} disabled={!options.length}>+ Add</Btn>
    </fieldset>
  );
}

function VoucherModal({ legs, start, terminals, onroute, platforms, onClose, onSave }) {
  const v = start.v;
  const [f, setF] = useState(() => ({
    legId: start.legId,
    terminalId: v?.terminalId ?? "",
    terminalName: v?.terminalName ?? "",
    departureAt: toPkLocal(v?.departureAt),
    paxTerminal: v?.paxTerminal ?? "", paxEnroute: v?.paxEnroute ?? "",
    incTerminal: v?.incTerminal ?? "", incEnroute: v?.incEnroute ?? "",
    loadAmount: v?.loadAmount ?? "", cargoAmount: v?.cargoAmount ?? "",
  }));
  const [lines, setLines] = useState(() => (v?.onroute ?? []).map((l) => ({ categoryId: l.categoryId ?? "", name: l.name, amount: l.amount })));
  const [online, setOnline] = useState(() => (v?.online ?? []).map((s) => ({ platformId: s.platformId ?? "", name: s.platformName, seats: s.seats, amount: s.amount })));
  const [busy, setBusy] = useState(false);
  const set = (k, x) => setF((p) => ({ ...p, [k]: x }));
  const termOpts = useMemo(() => [{ value: "", label: "— type a name below —" }, ...terminals.filter((t) => t.isActive || t.id === f.terminalId).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))], [terminals, f.terminalId]);
  const onlineTotal = online.reduce((s, o) => s + int(o.amount), 0);
  const totalSale = int(f.incTerminal) + int(f.incEnroute) + onlineTotal;

  // Lines whose category or platform was deactivated keep their printed name.
  const lineBody = (rows, idKey, nameKey, list) =>
    rows.filter((r) => r.amount !== "" || (idKey === "platformId" && r.seats !== "")).map((r) => {
      const item = list.find((o) => o.id === r[idKey]);
      return { [idKey]: item ? item.id : null, [nameKey]: item?.name ?? r.name, amount: int(r.amount), ...(idKey === "platformId" ? { seats: int(r.seats) } : {}) };
    });

  async function submit(e) {
    e.preventDefault();
    const body = {
      legId: Number(f.legId),
      terminalId: f.terminalId === "" ? null : Number(f.terminalId),
      ...(f.terminalName.trim() ? { terminalName: f.terminalName.trim() } : {}),
      departureAt: f.departureAt ? pkLocalToIso(f.departureAt) : null,
      paxTerminal: int(f.paxTerminal), paxEnroute: int(f.paxEnroute),
      incTerminal: int(f.incTerminal), incEnroute: int(f.incEnroute),
      loadAmount: int(f.loadAmount), cargoAmount: int(f.cargoAmount),
      onroute: lineBody(lines, "categoryId", "name", onroute),
      online: lineBody(online, "platformId", "platformName", platforms),
    };
    setBusy(true);
    const ok = await onSave(body);
    setBusy(false);
    if (ok) onClose();
  }

  const num = (k, label, extra = {}) => (
    <div>
      <Label htmlFor={`v-${k}`}>{label}</Label>
      <Input id={`v-${k}`} type="number" min="0" step="1" value={f[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  );

  return (
    <Modal title={v ? `Voucher ${v.voucherNo}` : "New terminal voucher"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4">
        {!v && <p className="rounded-xl bg-neutral-100 p-3 text-sm">The voucher number and QR code are made by the system when you save.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="v-leg">Leg</Label>
            <Select id="v-leg" value={f.legId} onChange={(e) => set("legId", Number(e.target.value))} options={legs.map((l) => ({ value: l.id, label: `Leg ${l.legNo}: ${l.title}` }))} />
          </div>
          <div>
            <Label htmlFor="v-term">Terminal</Label>
            <Select id="v-term" value={f.terminalId} onChange={(e) => {
              const t = terminals.find((x) => x.id === Number(e.target.value));
              setF((p) => ({ ...p, terminalId: e.target.value === "" ? "" : Number(e.target.value), terminalName: t ? t.cityName : p.terminalName }));
            }} options={termOpts} />
          </div>
          <div>
            <Label htmlFor="v-tn">Name as printed *</Label>
            <Input id="v-tn" required maxLength={120} value={f.terminalName} placeholder="Dera Ismail Khan" onChange={(e) => set("terminalName", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="v-dep">Departure</Label>
            <Input id="v-dep" type="datetime-local" value={f.departureAt} onChange={(e) => set("departureAt", e.target.value)} />
          </div>
          {num("paxTerminal", "Passengers: terminal")}
          {num("paxEnroute", "Passengers: en route")}
          {num("incTerminal", "Income: terminal (Rs)")}
          {num("incEnroute", "Income: en route (Rs)")}
          {num("loadAmount", "Load (Rs)")}
          {num("cargoAmount", "Cargo (Rs)")}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <LinesEditor title="On-route expenses" kind="onroute" rows={lines} setRows={setLines} options={onroute} />
          <LinesEditor title="Online sales by platform" kind="online" rows={online} setRows={setOnline} options={platforms} />
        </div>
        <p className="text-sm">
          Online income Rs {money(onlineTotal)} · <b>total sale Rs {money(totalSale)}</b>
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : v ? "Save voucher" : "Create voucher"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ all vouchers */

export function Vouchers() {
  const [f, setF] = useState({ q: "", page: 1 });
  const [q, setQ] = useState("");
  const list = useLoad(() => adminApi.vouchers({ q: f.q || undefined, page: f.page, limit: 30 }), [f]);
  return (
    <Page title="Terminal vouchers" intro="Every terminal voucher with its system number. Open the slip to print it with its QR code.">
      <Filters>
        <form onSubmit={(e) => { e.preventDefault(); setF({ q: q.trim(), page: 1 }); }} className="flex items-end gap-2">
          <div>
            <Label htmlFor="vq">Voucher no., terminal or report ID</Label>
            <Input id="vq" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Btn type="submit">Search</Btn>
        </form>
      </Filters>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="No vouchers yet. They are added inside a round trip report."
        cols={[
          { key: "voucherNo", label: "Voucher no.", render: (v) => <b className="font-mono">{v.voucherNo}</b> },
          { key: "roundTripId", label: "Report", render: (v) => <Link to={`/admin/round-trips/${v.roundTripId}`}>{v.roundTripId}</Link> },
          { key: "terminalName", label: "Terminal" },
          { key: "legTitle", label: "Leg" },
          { key: "departureAt", label: "Departure", render: (v) => departure(v.departureAt) },
          { key: "passengers", label: "Pax" },
          { key: "totalSale", label: "Total sale", className: "text-right", render: (v) => money(v.totalSale) },
          { key: "status", label: "Report", render: (v) => <StatusTag s={v.status} /> },
          { key: "scans", label: "Scans" },
          { key: "a", label: "", render: (v) => <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/slip/${v.id}`} target="_blank" rel="noreferrer">Slip</a> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={(page) => setF({ ...f, page })} />
    </Page>
  );
}

/* ------------------------------------------------------------------ off-route settings */

export function OffrouteSettings() {
  const cats = useLoad(() => adminApi.offrouteSettings(), []);
  const routes = useLoad(() => adminApi.routes(), []);
  const [openForm, form] = useForm();
  const [ask, confirmNode] = useConfirm();
  const routeOpts = (routes.data ?? []).map((r) => ({ value: r.id, label: `${r.code} · ${r.name}` }));
  const rows = cats.data ?? [];
  const reload = (ok) => (ok && cats.reload(), ok);

  const move = (i, d) => {
    const ids = rows.map((c) => c.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    act(() => adminApi.orderOffroute(ids), "Order saved").then(reload);
  };
  const catFields = (create) => [
    { name: "name", label: "Name", type: "text", required: true },
    ...(create ? [{ name: "globalAmount", label: "Global default amount (Rs)", type: "number", min: 0, step: 1, hint: "Used on every route that has no amount of its own." }] : []),
    { name: "requiresHostess", label: "Hostess", type: "checkbox", checkLabel: "Only on buses that carry a hostess" },
    { name: "busClasses", label: "Bus classes", type: "multi", options: BUS_CLASSES, hint: "Leave all off for every class." },
    ...(create ? [] : [{ name: "isActive", label: "Active", type: "checkbox", checkLabel: "Added to new reports" }]),
  ];
  const setAmount = (c, d) =>
    openForm({
      title: d?.routeId ? `${c.name} on ${d.routeCode}` : d ? `${c.name}: global default` : `${c.name}: amount for a route`,
      fields: [
        ...(d ? [] : [{ name: "routeId", label: "Route", type: "select", numeric: true, required: true, options: routeOpts }]),
        { name: "amount", label: "Amount (Rs)", type: "number", required: true, min: 0, step: 1 },
        ...(d?.routeId === null ? [] : [{ name: "isEnabled", label: "On this route", type: "checkbox", checkLabel: "Add this expense on this route (untick to leave it off)" }]),
      ],
      initial: d ? { amount: d.amount, isEnabled: d.isEnabled } : { isEnabled: true },
      note: "New amounts apply to reports created from now on. Existing and finalized reports keep their own amounts.",
      onSubmit: (b) => act(() => adminApi.setOffrouteDefault({ categoryId: c.id, routeId: d ? d.routeId : b.routeId, amount: int(b.amount), isEnabled: d?.routeId === null ? true : Boolean(b.isEnabled) }), "Default saved").then(reload),
    });

  return (
    <Page
      title="Off-route expense settings"
      intro="Fixed off-route expenses copied onto each new round trip report: the route's own amount when it has one, otherwise the global default. Every change is recorded in the Activity log."
      actions={<Btn kind="primary" onClick={() => openForm({ title: "Add an off-route expense", fields: catFields(true), initial: { busClasses: [] }, onSubmit: (b) => act(() => adminApi.createOffroute({ ...b, globalAmount: int(b.globalAmount) }), "Expense added").then(reload) })}>+ Add expense</Btn>}
    >
      <ErrorNote err={cats.err || routes.err} onRetry={cats.reload} />
      <Table
        loading={cats.loading}
        rows={rows}
        cols={[
          {
            key: "o",
            label: "Order",
            render: (c) => {
              const i = rows.indexOf(c);
              return (
                <div className="flex gap-1">
                  <Btn small aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</Btn>
                  <Btn small aria-label={`Move ${c.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</Btn>
                </div>
              );
            },
          },
          {
            key: "name",
            label: "Expense",
            render: (c) => (
              <div>
                <b className={c.isActive ? "" : "text-neutral-500 line-through"}>{c.name}</b>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!c.isActive && <Badge tone="red">inactive</Badge>}
                  {c.requiresHostess && <Badge tone="blue">hostess buses only</Badge>}
                  {c.busClasses?.length > 0 && <Badge tone="blue">{c.busClasses.join(", ")}</Badge>}
                </div>
              </div>
            ),
          },
          {
            key: "g",
            label: "Global default",
            render: (c) => {
              const g = c.defaults.find((d) => d.routeId === null);
              return <Btn small onClick={() => setAmount(c, g ?? { routeId: null, amount: 0, isEnabled: true })}>Rs {money(g?.amount ?? 0)}</Btn>;
            },
          },
          {
            key: "r",
            label: "Route amounts",
            render: (c) => (
              <div className="flex flex-wrap items-center gap-1">
                {c.defaults.filter((d) => d.routeId !== null).map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-1 rounded-full border border-neutral-400 px-2 py-0.5 text-xs">
                    <button type="button" className="font-bold underline" onClick={() => setAmount(c, d)} title={d.routeName}>
                      {d.routeCode}: {d.isEnabled ? `Rs ${money(d.amount)}` : "off"}
                    </button>
                    <button type="button" aria-label={`Remove the ${d.routeCode} amount`} onClick={async () => {
                      if (await ask(`Remove the ${d.routeCode} amount for ${c.name}?`, "That route then uses the global default.")) act(() => adminApi.removeOffrouteDefault(d.id), "Removed").then(reload);
                    }}>×</button>
                  </span>
                ))}
                <Btn small onClick={() => setAmount(c, null)}>+ Route</Btn>
              </div>
            ),
          },
          {
            key: "a",
            label: "",
            render: (c) => (
              <Btn small onClick={() => openForm({ title: `Edit ${c.name}`, fields: catFields(false), initial: { ...c, busClasses: c.busClasses ?? [] }, onSubmit: (b) => act(() => adminApi.updateOffroute(c.id, b), "Saved").then(reload) })}>Edit</Btn>
            ),
          },
        ]}
      />
      <p className="mt-3 text-sm text-mute">Expenses are never deleted, only deactivated, so old reports keep their names. A 0 amount is not printed.</p>
      {form}
      {confirmNode}
    </Page>
  );
}

/* ------------------------------------------------------------------ simple lists */

function ListBlock({ list, title, intro }) {
  const items = useLoad(() => adminApi.reportList(list), [list]);
  const [openForm, form] = useForm();
  const reload = (ok) => (ok && items.reload(), ok);
  return (
    <Section title={title} actions={<Btn small kind="primary" onClick={() => openForm({ title: `Add to ${title.toLowerCase()}`, fields: [{ name: "name", label: "Name", type: "text", required: true }], onSubmit: (b) => act(() => adminApi.addReportListItem(list, b.name), "Added").then(reload) })}>+ Add</Btn>}>
      <p className="mb-3 text-sm text-mute">{intro}</p>
      <ErrorNote err={items.err} onRetry={items.reload} />
      <Table
        loading={items.loading}
        rows={items.data}
        cols={[
          { key: "name", label: "Name", render: (x) => <b className={x.isActive ? "" : "text-neutral-500 line-through"}>{x.name}</b> },
          { key: "sortOrder", label: "Order" },
          { key: "s", label: "Status", render: (x) => (x.isActive ? <Badge tone="green">active</Badge> : <Badge tone="red">inactive</Badge>) },
          {
            key: "a",
            label: "",
            render: (x) => (
              <div className="flex gap-1">
                <Btn small onClick={() => openForm({ title: `Edit ${x.name}`, fields: [{ name: "name", label: "Name", type: "text", required: true }, { name: "sortOrder", label: "Order", type: "number", min: 0, step: 1 }], initial: x, onSubmit: (b) => act(() => adminApi.updateReportListItem(list, x.id, { name: b.name, ...(b.sortOrder !== undefined ? { sortOrder: int(b.sortOrder) } : {}) }), "Saved").then(reload) })}>Edit</Btn>
                <Btn small onClick={() => act(() => adminApi.updateReportListItem(list, x.id, { isActive: !x.isActive }), x.isActive ? "Deactivated" : "Activated").then(reload)}>{x.isActive ? "Deactivate" : "Activate"}</Btn>
              </div>
            ),
          },
        ]}
      />
      {form}
    </Section>
  );
}

/* ------------------------------------------------------------------ terminal deductions */

/** Fixed amounts each terminal deducts from its voucher's cash (Adda, loader, cleaner...). */
export function TerminalDeductions() {
  const data = useLoad(() => adminApi.terminalDeductions(), []);
  const [openForm, form] = useForm();
  const d = data.data;
  const cats = (d?.categories ?? []).filter((c) => c.isActive);
  const amountOf = (tid, cid) => d?.amounts.find((a) => a.terminalId === tid && a.categoryId === cid);
  const edit = (t, c) => {
    const a = amountOf(t.id, c.id);
    openForm({
      title: `${c.name} at ${t.city} · ${t.name}`,
      note: "Deducted automatically on every voucher this terminal generates from now on. Vouchers already generated keep their amounts. 0 = not deducted.",
      fields: [{ name: "amount", label: "Amount (Rs)", type: "number", required: true, min: 0, step: 1 }],
      initial: { amount: a?.amount ?? 0 },
      onSubmit: (b) => act(() => adminApi.setTerminalDeduction({ terminalId: t.id, categoryId: c.id, amount: int(b.amount) }), "Saved").then((ok) => (ok && data.reload(), ok)),
    });
  };
  return (
    <Page
      title="Terminal deductions"
      intro="Fixed costs each terminal takes from the cash it collects (Adda, loader, cleaner…). They are printed on the terminal's voucher and the rest is handed to the conductor. Names come from the on-route list."
    >
      <ErrorNote err={data.err} onRetry={data.reload} />
      {!d ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-300 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-3 py-2">Terminal</th>
                {cats.map((c) => <th key={c.id} className="px-3 py-2 text-right">{c.name}</th>)}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {d.terminals.filter((t) => t.isActive).map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2"><b>{t.city}</b> <span className="text-mute">{t.name}</span></td>
                  {cats.map((c) => {
                    const a = amountOf(t.id, c.id);
                    return (
                      <td key={c.id} className="px-3 py-1 text-right">
                        <button type="button" onClick={() => edit(t, c)} className={`rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:bg-neutral-100 hover:underline ${a?.amount ? "text-black" : "text-neutral-400"}`} aria-label={`${c.name} at ${t.city}: Rs ${a?.amount ?? 0}. Change`}>
                          {money(a?.amount ?? 0)}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold">{money(cats.reduce((s, c) => s + (amountOf(t.id, c.id)?.amount ?? 0), 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-mute">Click an amount to change it. Every change is recorded in the Activity log. Add new deduction names under On-route &amp; platforms.</p>
      {form}
    </Page>
  );
}

export function ReportLists() {
  return (
    <Page title="On-route expenses and online platforms" intro="The choices offered on each terminal voucher. Deactivate instead of deleting so old reports keep their names.">
      <ListBlock list="onroute" title="On-route expenses" intro="Paid at terminals on the way (Adda, TMA, Welfare…), entered on each voucher." />
      <ListBlock list="platforms" title="Online booking platforms" intro="Where online seats were sold (web app, Bookme, Bookkaro…). Online sales are subtracted before cash deposit." />
    </Page>
  );
}

/* ------------------------------------------------------------------ printable slip */

export function VoucherSlip() {
  const { id } = useParams();
  const slip = useLoad(() => adminApi.voucherSlip(id), [id]);
  const [width, setWidth] = useState(80);

  // The slip's own paper size, only while this page is open.
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `@page { size: ${width}mm auto; margin: 3mm; } @media print { body { background: #fff !important; } .slip-tools { display: none !important; } }`;
    document.head.appendChild(s);
    document.title = slip.data ? `Voucher ${slip.data.voucherNo}` : "Voucher slip";
    return () => s.remove();
  }, [width, slip.data]);

  if (slip.err) return <div className="p-6"><ErrorNote err={slip.err} onRetry={slip.reload} /></div>;
  const v = slip.data;
  if (!v) return <p className="p-6 text-sm">Loading…</p>;
  const line = (label, value, bold) => (
    <div className="flex justify-between gap-2"><span>{label}</span><span className={bold ? "font-bold" : ""}>{value}</span></div>
  );
  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        <Select aria-label="Paper width" className="!w-auto" value={width} onChange={(e) => setWidth(Number(e.target.value))} options={[{ value: 80, label: "80 mm paper" }, { value: 58, label: "58 mm paper" }]} />
        <Btn kind="primary" onClick={() => window.print()}>Print slip</Btn>
        <Link to={`/admin/round-trips/${v.roundTripId}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back to report</Link>
      </div>
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={{ width: `${width - 6}mm`, fontSize: width === 58 ? "8.5pt" : "10pt", lineHeight: 1.3 }}>
        <div className="text-center">
          <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
          <div>Terminal voucher</div>
          <div className="my-1 text-[1.5em] font-bold tracking-wider">{v.voucherNo}</div>
          {v.status !== "finalized" && <div>(report {v.roundTripId} · draft)</div>}
        </div>
        <hr className="my-1 border-dashed border-black" />
        {line("Report", v.roundTripId)}
        {line("Date", dmy(v.reportDate))}
        {line("Bus", v.fleetNo)}
        {line("Route", v.routeLabel)}
        <div>{v.legTitle}{v.legRef ? ` (ref ${v.legRef})` : ""}</div>
        {line("Terminal", v.terminal, true)}
        {line("Departure", departure(v.departureAt))}
        <hr className="my-1 border-dashed border-black" />
        {line("Pax terminal", v.paxTerminal)}
        {line("Pax en route", v.paxEnroute)}
        {line("Inc. terminal", money(v.incTerminal))}
        {line("Inc. en route", money(v.incEnroute))}
        {v.online.map((o) => line(`${o.platformName} (${o.seats})`, money(o.amount)))}
        {line("Total sale", money(v.totalSale), true)}
        {(v.loadAmount > 0 || v.cargoAmount > 0) && line("Load / cargo", `${money(v.loadAmount)} / ${money(v.cargoAmount)}`)}
        {v.onroute.filter((l) => l.amount).length > 0 && (
          <>
            <hr className="my-1 border-dashed border-black" />
            <div className="font-bold">On-route expenses</div>
            {v.onroute.filter((l) => l.amount).map((l, i) => <div key={i}>{line(l.name, money(l.amount))}</div>)}
          </>
        )}
        <hr className="my-1 border-dashed border-black" />
        {v.qrSvg ? (
          <div className="text-center">
            {/* SVG made by the server's QR library from this voucher's report link. */}
            <div className="mx-auto" style={{ width: width === 58 ? "30mm" : "38mm" }} dangerouslySetInnerHTML={{ __html: v.qrSvg }} />
            <div className="mt-1">Scan for the live trip report</div>
          </div>
        ) : (
          <div className="text-center">No QR code: make a new one on the report.</div>
        )}
      </div>
    </div>
  );
}
