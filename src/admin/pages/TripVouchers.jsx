/**
 * Terminal vouchers (staff):
 *   TripVouchers       /admin/trip-vouchers          trips with paid seats, and every issued voucher (search by number)
 *   TripVoucherDetail  /admin/trip-vouchers/:id      per terminal: the generated voucher, or a live preview with
 *                                                    "Generate voucher" (counter staff at their own terminal);
 *                                                    the passenger list with seat numbers
 *   TripVoucherSlip    /admin/voucher-slip/:id       printable slip of a generated voucher (80 / 58 mm)
 * Rules live on the server (tripVouchers.service.js): frozen once generated, booking from that terminal closes,
 * replacement (bus swap) by a manager or admin only, a cancelled trip voids its vouchers.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, Filters, fmtDT, Input, Label, Modal, Page, pkDate, Section, Select, StatusBadge, Table, useLoad,
} from "../ui";
import { Pager } from "./Operations";
import { departure, money, stamp } from "../../report/format";

/** "Voucher – Lahore → DI Khan (via …) · 02-11-2026 6:00 pm" */
export const voucherTitle = (routeName, departureAt, terminal) =>
  `Voucher – ${routeName}${terminal ? ` · ${terminal}` : ""} · ${departure(departureAt)}`;

const PAID_BY = { card: "Card", jazzcash: "JazzCash", easypaisa: "Easypaisa", cash: "Cash", bank_transfer: "Bank", wallet: "Wallet" };
const CHANNEL = { web: "Website", mobile_app: "App", counter: "Counter", phone: "Phone", agent: "Agent", on_road: "Road (conductor)" };
const V_STATUS = { generated: ["green", "Generated"], replaced: ["grey", "Replaced"], void: ["red", "Void"] };
const VoucherBadge = ({ s }) => <Badge tone={V_STATUS[s]?.[0] ?? "grey"}>{V_STATUS[s]?.[1] ?? s}</Badge>;
const int = (v) => (v === "" || v === null || v === undefined ? 0 : Math.max(0, Math.round(Number(v)) || 0));

/* ------------------------------------------------------------------ list */

function FindByNumber() {
  const navigate = useNavigate();
  const [no, setNo] = useState("");
  const [err, setErr] = useState("");
  async function find(e) {
    e.preventDefault();
    setErr("");
    const n = no.replace(/\D/g, "");
    if (n.length !== 10) return setErr("Voucher numbers have 10 digits.");
    try {
      const v = await adminApi.voucherByNumber(n);
      navigate(`/admin/trip-vouchers/${v.tripId}?voucher=${n}`);
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <form onSubmit={find} className="flex flex-wrap items-end gap-2">
      <div>
        <Label htmlFor="v-no">Find by voucher number</Label>
        <Input id="v-no" inputMode="numeric" value={no} onChange={(e) => setNo(e.target.value)} placeholder="1000000001" />
      </div>
      <Btn kind="primary" type="submit">Find</Btn>
      {err && <p role="alert" className="w-full text-sm text-red-800">{err}</p>}
    </form>
  );
}

export function TripVouchers() {
  const [tab, setTab] = useState("trips");
  const [f, setF] = useState({ from: pkDate(-3), to: pkDate(14), q: "", page: 1 });
  const [q, setQ] = useState("");
  const trips = useLoad(() => (tab === "trips" ? adminApi.tripVouchers({ from: f.from || undefined, to: f.to || undefined, q: f.q || undefined, page: f.page, limit: 25 }) : Promise.resolve(null)), [f, tab]);
  const issued = useLoad(() => (tab === "issued" ? adminApi.issuedVouchers({ from: f.from || undefined, to: f.to || undefined, q: f.q || undefined, page: f.page, limit: 25 }) : Promise.resolve(null)), [f, tab]);
  const list = tab === "trips" ? trips : issued;

  return (
    <Page title="Vouchers" intro="Each terminal generates its own voucher when the bus leaves it. Generating closes booking from that terminal and freezes the voucher.">
      <Section>
        <FindByNumber />
      </Section>
      <div className="mt-4 flex gap-2" role="tablist">
        {[["trips", "Trips"], ["issued", "Issued vouchers"]].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setF({ ...f, page: 1 }); }}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold ${tab === k ? "border-black bg-black text-white" : "border-black bg-white"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Filters>
          <div>
            <Label htmlFor="tv-from">Departing from</Label>
            <Input id="tv-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 1 })} />
          </div>
          <div>
            <Label htmlFor="tv-to">to</Label>
            <Input id="tv-to" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 1 })} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), page: 1 }); }} className="flex items-end gap-2">
            <div>
              <Label htmlFor="tv-q">{tab === "trips" ? "Route, bus or trip no." : "Terminal, route or bus"}</Label>
              <Input id="tv-q" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Btn type="submit">Search</Btn>
          </form>
          <Btn onClick={list.reload}>Refresh</Btn>
        </Filters>
      </div>
      <ErrorNote err={list.err} onRetry={list.reload} />
      {tab === "trips" ? (
        <Table
          loading={trips.loading}
          rows={trips.data?.data}
          rowKey={(r) => r.tripId}
          empty="No trips with paid seats in these dates."
          cols={[
            { key: "t", label: "Trip", render: (r) => <Link to={`/admin/trip-vouchers/${r.tripId}`} className="font-bold">{voucherTitle(r.routeName, r.departureAt)}</Link> },
            { key: "bus", label: "Bus", render: (r) => (r.fleetNo ? `${r.fleetNo} · ${r.registrationNo}` : r.registrationNo) },
            { key: "seats", label: "Paid seats", className: "text-right" },
            { key: "fareTotal", label: "Fare total", className: "text-right", render: (r) => `Rs ${money(r.fareTotal)}` },
            { key: "vouchersGenerated", label: "Vouchers", className: "text-right" },
            { key: "status", label: "Trip", render: (r) => <StatusBadge s={r.status} /> },
          ]}
        />
      ) : (
        <Table
          loading={issued.loading}
          rows={issued.data?.data}
          empty="No vouchers generated in these dates."
          cols={[
            { key: "voucherNo", label: "Voucher no.", render: (v) => <Link to={`/admin/trip-vouchers/${v.tripId}?voucher=${v.voucherNo}`} className="font-mono font-bold">{v.voucherNo}</Link> },
            { key: "name", label: "Voucher", render: (v) => voucherTitle(v.routeName, v.departureAt, v.terminalName) },
            { key: "busNo", label: "Bus" },
            { key: "seatsBoarding", label: "Boarded / on bus", render: (v) => `${v.seatsBoarding} / ${v.onBoard}` },
            { key: "cashToConductor", label: "Cash to conductor", className: "text-right", render: (v) => `Rs ${money(v.cashToConductor)}` },
            { key: "gen", label: "Generated by", render: (v) => <>{v.generatedByName}<br /><span className="text-xs text-mute">{fmtDT(v.generatedAt)}</span></> },
            { key: "status", label: "Status", render: (v) => <VoucherBadge s={v.status} /> },
            { key: "a", label: "", render: (v) => <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/voucher-slip/${v.id}`} target="_blank" rel="noreferrer">Slip</a> },
          ]}
        />
      )}
      <Pager p={list.data?.pagination} onPage={(page) => setF({ ...f, page })} />
    </Page>
  );
}

/* ------------------------------------------------------------------ detail */

function MoneyLines({ v }) {
  const row = (label, value, strong) => (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-black pt-1 font-extrabold" : ""}`}><span>{label}</span><span>Rs {value}</span></div>
  );
  return (
    <div className="grid gap-1 text-sm">
      {row("Terminal cash (+)", money(v.terminalCash))}
      {row("Load (+)", money(v.loadAmount))}
      {row("Cargo (+)", money(v.cargoAmount))}
      {(v.deductions ?? []).map((d) => row(`${d.name} (−)`, money(d.amount)))}
      {!(v.deductions ?? []).length && row("Deductions (−)", money(v.deductionsTotal))}
      {row("Cash to conductor", money(v.cashToConductor), true)}
      <div className="flex justify-between gap-3 text-mute"><span>Paid online (not cash)</span><span>Rs {money(v.onlinePaid)}</span></div>
    </div>
  );
}

function LinesTable({ lines }) {
  return (
    <Table
      rows={lines}
      rowKey={(l) => l.destination}
      empty="Nobody boards here."
      cols={[
        { key: "destination", label: "Destination", render: (l) => <b>{l.destination}</b> },
        { key: "seats", label: "Seats", className: "text-right", render: (l) => <>{l.seats}{l.freeSeats ? <span className="text-mute"> ({l.freeSeats} free)</span> : null}</> },
        { key: "fare", label: "Fare", className: "text-right", render: (l) => `Rs ${money(l.fare)}` },
      ]}
    />
  );
}

/** One terminal: its generated voucher, or a live preview with the generate form. */
function TerminalBlock({ t, trip, isManager, onChanged, highlight }) {
  const [load, setLoad] = useState("");
  const [cargo, setCargo] = useState("");
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reason, setReason] = useState("");
  const voucher = useLoad(() => (t.voucher ? adminApi.issuedVoucher(t.voucher.id) : Promise.resolve(null)), [t.voucher?.id]);
  const v = voucher.data;
  const preview = t.preview ? { ...t.preview, loadAmount: int(load), cargoAmount: int(cargo), cashToConductor: t.preview.terminalCash + int(load) + int(cargo) - t.preview.deductionsTotal } : null;

  async function generate() {
    setBusy(true);
    const ok = await act(() => adminApi.generateVoucher(trip.id, { boardingStopId: t.stopId, loadAmount: int(load), cargoAmount: int(cargo) }), "Voucher generated", `Booking from ${t.city} is now closed.`);
    setBusy(false);
    if (ok) onChanged();
  }
  async function replace(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await act(() => adminApi.replaceVoucher(t.voucher.id, reason.trim()), "Replacement voucher made", "Print the new slip for the conductor.");
    setBusy(false);
    if (ok) {
      setReplacing(false);
      onChanged();
    }
  }

  return (
    <Section
      title={<>{t.city} <span className="font-normal text-mute">· {t.terminal} · departs {departure(t.departureAt)}</span></>}
      actions={
        t.voucher ? (
          <>
            <VoucherBadge s="generated" />
            <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/voucher-slip/${t.voucher.id}`} target="_blank" rel="noreferrer">Print slip</a>
            {isManager && <Btn small onClick={() => setReplacing(true)}>Replace (bus swap)…</Btn>}
          </>
        ) : (
          <Badge tone="amber">Not generated: booking still open here</Badge>
        )
      }
    >
      <div className={highlight ? "rounded-xl ring-4 ring-amber-300" : ""}>
        {t.voucher ? (
          !v ? (
            <p className="text-sm text-mute">{voucher.err || "Loading…"}</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div>
                <p className="mb-2 text-sm">
                  Voucher no. <b className="font-mono text-base">{v.voucherNo}</b> · bus {v.busNo} · generated by <b>{v.generatedByName}</b>, {fmtDT(v.generatedAt)}
                  {v.replacesNo ? ` · replaces ${v.replacesNo} (${v.replaceReason})` : ""}
                </p>
                <LinesTable lines={v.lines} />
                <p className="mt-2 text-sm">
                  Boarded here: <b>{v.seatsBoarding}</b> · on the bus after {t.city}: <b>{v.onBoard}</b>{v.freeOnBoard ? ` (${v.freeOnBoard} free)` : ""}
                </p>
              </div>
              <MoneyLines v={v} />
            </div>
          )
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
            <div>
              <p className="mb-2 text-sm text-mute">Live preview from paid seats. It freezes when the voucher is generated.</p>
              <LinesTable lines={preview.lines} />
              <p className="mt-2 text-sm">
                Boarding here: <b>{preview.seatsBoarding}</b> · on the bus after {t.city}: <b>{preview.onBoard}</b>{preview.freeOnBoard ? ` (${preview.freeOnBoard} free)` : ""}
              </p>
            </div>
            <div className="grid gap-3">
              {t.canGenerate && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`ld-${t.stopId}`}>Load (Rs)</Label>
                    <Input id={`ld-${t.stopId}`} type="number" min="0" step="1" value={load} onChange={(e) => setLoad(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label htmlFor={`cg-${t.stopId}`}>Cargo (Rs)</Label>
                    <Input id={`cg-${t.stopId}`} type="number" min="0" step="1" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="0" />
                  </div>
                </div>
              )}
              <MoneyLines v={preview} />
              {t.canGenerate ? (
                trip.hasConductor ? (
                  <Btn kind="primary" disabled={busy} onClick={generate}>{busy ? "Generating…" : `Generate voucher for ${t.city}`}</Btn>
                ) : (
                  <p className="rounded-xl border border-amber-400 bg-amber-50 p-2 text-sm">Assign a conductor first (Trips & boarding → Bus & crew).</p>
                )
              ) : (
                <p className="text-xs text-mute">Only {t.city} counter staff, managers and admins can generate this voucher.</p>
              )}
            </div>
          </div>
        )}
        {t.history.length > 0 && (
          <p className="mt-3 text-xs text-mute">
            Earlier: {t.history.map((h) => `${h.voucherNo} (${h.status}${h.closedReason ? `: ${h.closedReason}` : ""})`).join(" · ")}
          </p>
        )}
      </div>
      {replacing && (
        <Modal title={`Replace voucher ${t.voucher.voucherNo}`} onClose={() => setReplacing(false)}>
          <form onSubmit={replace} className="grid gap-3">
            <p className="text-sm">
              For a bus swap. Change the bus first (Trips & boarding → Bus & crew), then replace the voucher: it gets a new number with the same details and the new bus.
              The old voucher is marked “Replaced”.
            </p>
            <div>
              <Label htmlFor="rp-r">Reason *</Label>
              <Input id="rp-r" required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bus broke down near Sargodha, replaced by LES-1234" />
            </div>
            <div className="flex gap-2">
              <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Working…" : "Approve and replace"}</Btn>
              <Btn onClick={() => setReplacing(false)}>Cancel</Btn>
            </div>
          </form>
        </Modal>
      )}
    </Section>
  );
}

export function TripVoucherDetail({ isManager }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  const highlightNo = search.get("voucher");
  const d = useLoad(() => adminApi.tripVoucher(id), [id]);
  const [onlyStop, setOnlyStop] = useState("");

  if (d.err) return <Page title="Vouchers"><Link to="/admin/trip-vouchers" className="text-sm">‹ All vouchers</Link><ErrorNote err={d.err} onRetry={d.reload} /></Page>;
  if (!d.data) return <Page title="Vouchers"><p className="text-sm text-mute">Loading…</p></Page>;
  const { trip, terminals, passengers } = d.data;
  const shown = onlyStop ? passengers.filter((p) => String(p.boardingStopId) === onlyStop) : passengers;

  return (
    <Page
      title={voucherTitle(trip.routeName, trip.departureAt)}
      intro={`Trip ${trip.id} · bus ${trip.fleetNo ? `${trip.fleetNo} · ` : ""}${trip.busNo} · driver ${trip.driverName ?? "–"} · conductor ${trip.conductorName ?? trip.standInConductorName ?? "not assigned"} · last booking change ${fmtDT(d.data.lastUpdate)}`}
      actions={<><StatusBadge s={trip.status} /><Btn onClick={d.reload}>Refresh</Btn></>}
    >
      <Link to="/admin/trip-vouchers" className="text-sm">‹ All vouchers</Link>
      {terminals.map((t) => (
        <TerminalBlock key={t.stopId} t={t} trip={trip} isManager={isManager} onChanged={d.reload} highlight={highlightNo && t.voucher?.voucherNo === highlightNo} />
      ))}

      <Section
        title={`Passengers (${shown.length})`}
        actions={
          <Select aria-label="Boarding at" className="!w-auto" value={onlyStop} onChange={(e) => setOnlyStop(e.target.value)}
            options={[{ value: "", label: "All boarding terminals" }, ...terminals.map((t) => ({ value: String(t.stopId), label: `Boarding at ${t.city}` }))]} />
        }
      >
        <Table
          rows={shown}
          rowKey={(p) => p.ticketId}
          empty="No paid passengers."
          cols={[
            { key: "seat", label: "Seat", render: (p) => <b>{p.seat}</b> },
            { key: "name", label: "Passenger", render: (p) => <>{p.name} <span className="text-mute">({p.gender === "female" ? "F" : "M"})</span></> },
            { key: "phone", label: "Phone", render: (p) => p.phone ?? "–" },
            { key: "route", label: "From → to", render: (p) => `${p.boarding} → ${p.destination}` },
            { key: "fare", label: "Fare", className: "text-right", render: (p) => (p.isFree ? <Badge tone="blue">free</Badge> : money(p.fare)) },
            { key: "paid", label: "Paid via", render: (p) => `${CHANNEL[p.channel] ?? p.channel}${p.paidBy ? ` · ${PAID_BY[p.paidBy] ?? p.paidBy}` : ""}` },
            { key: "pnr", label: "Booking", render: (p) => <span className="font-mono text-xs">{p.pnr}</span> },
            { key: "status", label: "Status", render: (p) => (p.status === "no_show" ? <><Badge tone="red">did not travel</Badge>{p.noShowNote ? <div className="text-xs text-mute">{p.noShowNote}</div> : null}</> : <StatusBadge s={p.status} />) },
          ]}
        />
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ printable slip */

export function TripVoucherSlip() {
  const { id } = useParams();
  const v = useLoad(() => adminApi.issuedVoucher(id), [id]);
  const [width, setWidth] = useState(80);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `@page { size: ${width}mm auto; margin: 3mm; } @media print { body { background: #fff !important; } .slip-tools { display: none !important; } }`;
    document.head.appendChild(s);
    return () => s.remove();
  }, [width]);
  useEffect(() => {
    if (v.data) document.title = `Voucher ${v.data.voucherNo}`;
  }, [v.data]);

  if (v.err) return <div className="p-6"><ErrorNote err={v.err} onRetry={v.reload} /></div>;
  const x = v.data;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const row = (label, value, bold) => (
    <div className="flex justify-between gap-2"><span>{label}</span><span className={bold ? "font-bold" : ""}>{value}</span></div>
  );

  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        <Select aria-label="Paper width" className="!w-auto" value={width} onChange={(e) => setWidth(Number(e.target.value))} options={[{ value: 80, label: "80 mm paper" }, { value: 58, label: "58 mm paper" }]} />
        <Btn kind="primary" onClick={() => window.print()}>Print slip</Btn>
        <Link to={`/admin/trip-vouchers/${x.tripId}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      {x.status !== "generated" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-red-400 bg-red-50 p-2 text-center text-sm text-red-900">
          This voucher is {x.status === "void" ? "VOID" : `REPLACED${x.replacedByNo ? ` by ${x.replacedByNo}` : ""}`}. Do not hand it to the conductor.
        </p>
      )}
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={{ width: `${width - 6}mm`, fontSize: width === 58 ? "8.5pt" : "10pt", lineHeight: 1.35 }}>
        <div className="text-center">
          <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
          <div className="text-[1.25em] font-bold">Terminal Voucher</div>
          {x.status !== "generated" && <div className="font-bold">*** {x.status.toUpperCase()} ***</div>}
        </div>
        {dash}
        {row("Voucher no.", x.voucherNo, true)}
        {row("Trip no.", x.tripId)}
        {row("Terminal", x.terminalName)}
        <div>Route: {x.routeName}</div>
        {row("Bus no.", x.busNo)}
        {row("Dep. time", departure(x.departureAt))}
        {row("Driver", x.driverName ?? "–")}
        {row("Conductor", x.conductorName ?? "–")}
        {x.replacesNo && <div>Replaces {x.replacesNo}: {x.replaceReason}</div>}
        {dash}
        <div className="flex justify-between font-bold"><span>Destination</span><span>Seats</span></div>
        <div className="text-right font-bold">Fare</div>
        {dash}
        {x.lines.map((l) => (
          <div key={l.destination} className="mb-1">
            <div className="flex justify-between"><span>{l.destination}</span><span>{l.seats}{l.freeSeats ? ` (${l.freeSeats} free)` : ""}</span></div>
            <div className="text-right">{money(l.fare)}</div>
          </div>
        ))}
        {x.lines.length === 0 && <div>Nobody boarded here.</div>}
        {dash}
        <div className="flex justify-between font-bold"><span>Total</span><span>{x.seatsBoarding}</span></div>
        <div className="text-right font-bold">{money(x.fareBoarding)}</div>
        {row("On bus after here", `${x.onBoard}${x.freeOnBoard ? ` (${x.freeOnBoard} free)` : ""}`)}
        {dash}
        {row("Terminal cash (+)", money(x.terminalCash))}
        {row("Load (+)", money(x.loadAmount))}
        {row("Cargo (+)", money(x.cargoAmount))}
        {x.deductions.map((d) => <div key={d.name}>{row(`${d.name} (−)`, money(d.amount))}</div>)}
        {dash}
        {row("Cash to conductor", `${money(x.cashToConductor)} PKR`, true)}
        {x.onlinePaid > 0 && row("Paid online", money(x.onlinePaid))}
        {dash}
        {row("Generated at", stamp(x.generatedAt))}
        {row("Generated by", x.generatedByName)}
        {x.approvedByName && row("Approved by", x.approvedByName)}
        <div className="mt-3">Driver sig: ______________</div>
        <div className="mt-3">Conductor sig: ______________</div>
        {dash}
        {x.qrSvg && (
          <div className="text-center">
            {/* SVG made by the server's QR library from this voucher's link (staff sign in to open it). */}
            <div className="mx-auto" style={{ width: width === 58 ? "28mm" : "34mm" }} dangerouslySetInnerHTML={{ __html: x.qrSvg }} />
            <div className="mt-1">Scan to open this voucher</div>
          </div>
        )}
      </div>
    </div>
  );
}
