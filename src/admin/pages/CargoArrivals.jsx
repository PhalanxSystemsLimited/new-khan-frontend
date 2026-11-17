/**
 * Cargo at the destination (cargo part 3):
 *   CargoArrivals   /admin/cargo-arrivals   buses bringing parcels here (tick them off), parcels waiting for collection
 *                                           (hand over, return), today's hand-overs. One scan box does the right thing:
 *                                           a parcel still on a bus is received, one waiting here opens the hand-over.
 *   HandOverWindow  hand a parcel to the receiver (or someone with the slip): who, their CNIC, and the money if the
 *                   receiver pays. Also opened from a parcel's details.
 * Printing the delivery receipt: CargoPrint.jsx (ParcelReceipt). The server checks every rule (cargo.arrival.js).
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CnicInput, cnicMessage } from "../../components/PatternFields";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, fmtDT, fmtT, FormError, formError, inFormSave, Input, Label, lastActError, Modal, Page, rs, Section, Select,
  Table, useForm, useLoad,
} from "../ui";
import { PaymentBadge, phoneText } from "./cargoShared";

const inputCls = "w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black";
const MANAGERS = ["manager", "admin", "super_admin"];
const maskCnic = (v) => (v ? String(v).replace(/^(\d{5})-?\d{7}-?(\d)$/, "$1-*******-$2") : "");
const owes = (p) => p.payment === "to_pay" && !p.paidAt;

/** Hand a parcel over. `parcel` needs: id, parcelNo, receiverName, receiverPhone, receiverCnic, payment, paidAt, charge. */
export function HandOverWindow({ parcel: p, onClose }) {
  const navigate = useNavigate();
  const [proof, setProof] = useState("receiver_cnic");
  const [name, setName] = useState(p.receiverName ?? "");
  const [cnic, setCnic] = useState("");
  const [cash, setCash] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pays = owes(p);

  const pick = (x) => {
    setProof(x);
    setName(x === "receiver_cnic" ? p.receiverName ?? "" : "");
    setCnic("");
  };
  const problems = {
    collectorName: tried && name.trim().length < 2 ? "Write the name of the person collecting." : null,
    collectorCnic: tried ? cnicMessage(cnic, { required: true }) || null : null,
    cashReceived: tried && pays && !cash ? `Take ${rs(p.charge)} first, then tick the box.` : null,
  };
  const msg = (k) => problems[k] ?? err?.byField?.[k];

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    if (name.trim().length < 2 || cnicMessage(cnic, { required: true }) || (pays && !cash)) return;
    setBusy(true);
    setErr(null);
    let res;
    const ok = await inFormSave(() => act(async () => { res = await adminApi.cargoDeliver(p.id, { proof, collectorName: name.trim(), collectorCnic: cnic, cashReceived: pays && cash }); }));
    setBusy(false);
    if (!ok) return setErr(formError(lastActError()));
    navigate(`/admin/parcel-receipt/${p.id}`, { state: { justDelivered: true, cashTaken: res.cashTaken } });
  }

  const radio = (value, label, hint) => (
    <label className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm ${proof === value ? "border-black bg-neutral-50" : "border-neutral-300"}`}>
      <input type="radio" name="proof" value={value} checked={proof === value} onChange={() => pick(value)} className="mt-0.5 h-5 w-5 accent-black" />
      <span><b>{label}</b><br /><span className="text-mute">{hint}</span></span>
    </label>
  );

  return (
    <Modal title={`Hand over ${p.parcelNo}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <p className="rounded-xl bg-neutral-100 p-3 text-sm">
          For <b>{p.receiverName}</b> · {phoneText(p.receiverPhone)}{p.pieces ? ` · ${p.pieces} piece${p.pieces === 1 ? "" : "s"}` : ""}{p.fromCity ? ` · from ${p.fromCity}` : ""}
        </p>
        {pays && (
          <div className="rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="text-lg font-extrabold">Take {rs(p.charge)}</p>
            <p>The receiver pays on collection.</p>
            <label className="mt-2 flex items-center gap-2 font-semibold">
              <input type="checkbox" id="h-cash" checked={cash} onChange={(e) => setCash(e.target.checked)} className="h-5 w-5 accent-black" />
              I have taken {rs(p.charge)}
            </label>
            {msg("cashReceived") && <p role="alert" className="mt-1 text-sm text-red-700">{msg("cashReceived")}</p>}
          </div>
        )}
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-600">Who is collecting</legend>
          {radio("receiver_cnic", "The receiver", p.receiverCnic ? `Check their CNIC: it must be ${maskCnic(p.receiverCnic)} (given at booking).` : "Check their CNIC card and the name.")}
          {radio("slip", "Someone else with the slip", "They show the slip or a picture of it, and their own CNIC.")}
        </fieldset>
        <div>
          <Label htmlFor="h-name">Name of the person collecting *</Label>
          <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          {msg("collectorName") && <p role="alert" className="mt-1 text-sm text-red-700">{msg("collectorName")}</p>}
        </div>
        <div>
          <Label htmlFor="h-cnic">Their CNIC *</Label>
          <CnicInput id="h-cnic" className={inputCls} value={cnic} onChange={setCnic} messages={false} />
          {msg("collectorCnic") && <p role="alert" className="mt-1 text-sm text-red-700">{msg("collectorCnic")}</p>}
        </div>
        <FormError err={err} />
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Hand over"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

/** "Return to sender" form (reason). Returns the openForm props. */
export const returnForm = (p, onDone) => ({
  title: `Return ${p.parcelNo} to the sender`,
  note: `Not collected${p.daysWaiting ? ` after ${p.daysWaiting} day${p.daysWaiting === 1 ? "" : "s"}` : ""}. It goes back to the sender at ${p.fromCity ?? "the sending terminal"}.`,
  fields: [{ name: "reason", label: "Reason", type: "textarea", required: true, rows: 2 }],
  initial: { reason: p.daysWaiting ? `Not collected in ${p.daysWaiting} days` : "" },
  submitLabel: "Mark returned",
  onSubmit: (b) => act(() => adminApi.cargoReturn(p.id, b.reason), `${p.parcelNo} marked returned`).then((ok) => (ok && onDone?.(), ok)),
});

export function CargoArrivals({ me }) {
  const isManager = MANAGERS.includes(me.role);
  const [terminalId, setTerminalId] = useState(me.terminalId ? String(me.terminalId) : "");
  const setup = useLoad(() => (isManager ? adminApi.cargoSetup() : Promise.resolve(null)), [isManager]);
  const view = useLoad(() => (terminalId || !isManager ? adminApi.cargoArrivals(isManager ? terminalId : undefined) : Promise.resolve(null)), [terminalId]);
  const [ticked, setTicked] = useState({});
  const [scan, setScan] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [handing, setHanding] = useState(null);
  const [openForm, form] = useForm();
  const box = useRef(null);
  const v = view.data;

  useEffect(() => setTicked({}), [v]);

  async function receive(body) {
    setBusy(true);
    let res;
    const ok = await inFormSave(() => act(async () => { res = await adminApi.cargoReceive({ ...body, ...(isManager ? { terminalId: Number(terminalId) } : {}) }); }));
    setBusy(false);
    if (ok) {
      view.setData(res.data);
      setMsg({ ok: true, text: `Received: ${res.received.join(", ")}. ${res.received.length === 1 ? "It is" : "They are"} now waiting for collection.` });
    } else setMsg({ ok: false, text: lastActError()?.message || "Not received." });
    return ok;
  }

  // One box for the scanner: still on a bus -> receive it; waiting here -> hand it over.
  async function scanned(e) {
    e.preventDefault();
    const m = scan.toUpperCase().match(/CG-?(\d{1,8})/);
    if (!m) return setMsg({ ok: false, text: "Type or scan a parcel number (CG-…)." });
    const no = `CG-${m[1].padStart(7, "0")}`;
    const waiting = v?.waiting.find((p) => p.parcelNo === no);
    setScan("");
    if (waiting) {
      setMsg(null);
      setHanding(waiting);
      return;
    }
    await receive({ parcel: no });
    box.current?.focus();
  }

  const ids = Object.keys(ticked).filter((k) => ticked[k]).map(Number);

  return (
    <Page
      title={v ? `Arrivals & collection · ${v.terminal.city}` : "Arrivals & collection"}
      intro="Tick parcels off the arriving buses, then hand them over when the receiver comes. Scanning a parcel does the right thing: on a bus it is received, waiting here it opens the hand-over."
    >
      {isManager && (
        <div className="mb-4 max-w-xs">
          <Label htmlFor="ar-t">Terminal</Label>
          <Select id="ar-t" value={terminalId} onChange={(e) => setTerminalId(e.target.value)}
            options={[{ value: "", label: "— choose —" }, ...(setup.data?.terminals ?? []).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))]} />
        </div>
      )}
      <ErrorNote err={view.err} onRetry={view.reload} />
      {isManager && !terminalId && <p className="text-sm text-mute">Choose a terminal.</p>}
      {v && (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <Badge tone="blue">{v.counts.onTheWay} on the way</Badge>
            <Badge tone="green">{v.counts.waiting} waiting for collection</Badge>
            {v.counts.overdue > 0 && <Badge tone="red">{v.counts.overdue} overdue (over {v.overdueDays} days)</Badge>}
            {v.counts.toCollectCash > 0 && <Badge tone="amber">{rs(v.counts.toCollectCash)} to collect from receivers</Badge>}
          </div>
          <form onSubmit={scanned} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Label htmlFor="ar-scan">Scan or type a parcel number</Label>
              {/* A plain input: the shared Input does not pass a ref (the box is focused again after each scan). */}
              <input id="ar-scan" ref={box} value={scan} onChange={(e) => setScan(e.target.value)} placeholder="CG-0000123" autoComplete="off" autoFocus className={inputCls} />
            </div>
            <Btn kind="primary" type="submit" disabled={busy}>Go</Btn>
            <Btn onClick={view.reload}>Refresh</Btn>
          </form>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.text}</p>}

          <Section title={`Arriving buses (${v.buses.length})`}>
            {v.buses.length === 0 && <p className="text-sm text-mute">No bus is bringing parcels here right now.</p>}
            {/* minmax(0, 1fr): the tables scroll inside their own box instead of widening the page on a phone. */}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
              {v.buses.map((g) => (
                <div key={g.listId} className="rounded-xl border-2 border-neutral-300 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <b className="text-base">Bus {g.bus}</b>
                    <span>from {g.fromCity} · left {fmtDT(g.leftAt)} · due here {g.dueAt ? fmtT(g.dueAt) : "–"}</span>
                    <Badge tone="blue">List {g.listNo}</Badge>
                    {g.late && <Badge tone="red">Due over 2 hours ago: check the bus</Badge>}
                    <span className="text-mute">{g.received} of {g.parcels.length} received</span>
                  </div>
                  <Table
                    rows={g.parcels}
                    cols={[
                      {
                        key: "tick",
                        label: "",
                        render: (p) =>
                          p.status === "loaded" ? (
                            <input type="checkbox" aria-label={`Received ${p.parcelNo}`} checked={Boolean(ticked[p.id])} onChange={(e) => setTicked((t) => ({ ...t, [p.id]: e.target.checked }))} className="h-5 w-5 accent-black" />
                          ) : (
                            <Badge tone="green">Received</Badge>
                          ),
                      },
                      { key: "parcelNo", label: "Parcel", render: (p) => <span className="font-mono font-bold">{p.parcelNo}</span> },
                      { key: "receiver", label: "Receiver", render: (p) => <>{p.receiverName}<br /><span className="text-xs text-mute">{phoneText(p.receiverPhone)}</span></> },
                      { key: "size", label: "Pieces", render: (p) => p.pieces },
                      { key: "pay", label: "Charge", render: (p) => <>{rs(p.charge)} <PaymentBadge p={p} /></> },
                    ]}
                  />
                  {g.toReceive > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn small onClick={() => setTicked((t) => ({ ...t, ...Object.fromEntries(g.parcels.filter((p) => p.status === "loaded").map((p) => [p.id, true])) }))}>Tick all ({g.toReceive})</Btn>
                      <Btn small kind="primary" disabled={busy || !g.parcels.some((p) => ticked[p.id])}
                        onClick={() => receive({ parcelIds: g.parcels.filter((p) => ticked[p.id] && p.status === "loaded").map((p) => p.id) })}>
                        Mark ticked as received ({g.parcels.filter((p) => ticked[p.id] && p.status === "loaded").length})
                      </Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {ids.length > 0 && <p className="mt-2 text-xs text-mute">{ids.length} ticked.</p>}
          </Section>

          <Section title={`Waiting for collection (${v.waiting.length})`}>
            <Table
              rows={v.waiting}
              empty="Nothing waiting for collection."
              cols={[
                { key: "parcelNo", label: "Parcel", render: (p) => <span className="font-mono font-bold">{p.parcelNo}</span> },
                { key: "receiver", label: "Receiver", render: (p) => <>{p.receiverName}<br /><span className="text-xs text-mute">{phoneText(p.receiverPhone)}</span></> },
                { key: "from", label: "From", render: (p) => <>{p.fromCity}<br /><span className="text-xs text-mute">{p.senderName}</span></> },
                { key: "days", label: "Waiting", render: (p) => (p.overdue ? <Badge tone="red">{p.daysWaiting} days: overdue</Badge> : p.daysWaiting === 0 ? "today" : `${p.daysWaiting} day${p.daysWaiting === 1 ? "" : "s"}`) },
                { key: "pay", label: "Charge", render: (p) => (owes(p) ? <Badge tone="amber">Receiver pays {rs(p.charge)}</Badge> : <Badge tone="green">Paid</Badge>) },
                {
                  key: "a",
                  label: "",
                  render: (p) => (
                    <div className="flex flex-wrap gap-1">
                      <Btn small kind="primary" onClick={() => setHanding(p)}>Hand over</Btn>
                      <Btn small onClick={() => openForm(returnForm(p, view.reload))}>Return…</Btn>
                    </div>
                  ),
                },
              ]}
            />
          </Section>

          <Section title={`Handed over today (${v.handedOver.length})`}>
            <Table
              rows={v.handedOver}
              empty="None yet today."
              cols={[
                { key: "parcelNo", label: "Parcel", render: (p) => <span className="font-mono font-bold">{p.parcelNo}</span> },
                { key: "when", label: "When", render: (p) => fmtT(p.deliveredAt) },
                { key: "who", label: "Collected by", render: (p) => <>{p.collectedByName}<br /><span className="text-xs text-mute">{p.collectedProof === "slip" ? "with the slip" : "receiver, own CNIC"}</span></> },
                { key: "pay", label: "Charge", render: (p) => <>{rs(p.charge)} <PaymentBadge p={p} /></> },
                { key: "r", label: "", render: (p) => <Link className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" to={`/admin/parcel-receipt/${p.id}`}>Receipt</Link> },
              ]}
            />
          </Section>
        </>
      )}
      {handing && <HandOverWindow parcel={handing} onClose={() => { setHanding(null); view.reload(); }} />}
      {form}
    </Page>
  );
}
