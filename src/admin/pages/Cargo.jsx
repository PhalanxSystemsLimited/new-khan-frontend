/**
 * Cargo (parcels sent on the buses), part 1:
 *   BookParcel     /admin/book-parcel      book a parcel at the counter, then print its slip and labels
 *   Parcels        /admin/parcels          search (number, phone, CNIC, name, or a scanned slip QR), a parcel's
 *                                          details and history, cancel one not on a bus yet
 *   CargoSettings  /admin/cargo-settings   rates per city pair, the rules and not-allowed items printed on the slip
 * Printing: CargoPrint.jsx. The server checks every rule again (cargo.service.js).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CnicInput, cnicMessage, PhoneInput, phoneMessage } from "../../components/PatternFields";
import { adminApi } from "../api";
import {
  act, Badge, Btn, ErrorNote, Filters, fmtDT, formError, FormError, inFormSave, Input, Label, lastActError, Modal, Page, rs, Section, Select, SkeletonDetails, SkeletonTable, Table, useForm, useLoad,
} from "../ui";
import { Pager } from "./Operations";
import { PaymentBadge, phoneText } from "./cargoShared";
import { HandOverWindow, returnForm } from "./CargoArrivals";

export { PaymentBadge, phoneText };

/* ------------------------------------------------------------------ shared */

const inputCls = "w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black";
const MANAGERS = ["manager", "admin", "super_admin"];

export const PARCEL_STATUS = {
  booked: ["Booked", "grey"],
  loaded: ["On a bus", "blue"],
  arrived: ["Arrived", "green"],
  delivered: ["Delivered", "green"],
  returned: ["Returned", "amber"],
  cancelled: ["Cancelled", "red"],
};
export const ParcelStatus = ({ s, listed }) =>
  s === "booked" && listed ? <Badge tone="blue">On a cargo list</Badge> : <Badge tone={PARCEL_STATUS[s]?.[1] ?? "grey"}>{PARCEL_STATUS[s]?.[0] ?? s}</Badge>;
/** History entries in words. */
const EVENT = {
  booked: "Booked", cancelled: "Cancelled", listed: "Put on a bus's cargo list", unlisted: "Taken off a cargo list",
  loaded: "Left on the bus", bus_changed: "Bus changed", arrived: "Received at the destination", delivered: "Handed over",
  returned: "Returned to the sender",
};

/** Same as the server (cargo.service.js chargeFor): weight x per kg or pieces x per piece, the higher, never below the minimum. */
export function chargeFor(rate, weightKg, pieces) {
  if (!rate || !(Number(weightKg) > 0) || !(Number(pieces) >= 1)) return null;
  const byWeight = Math.ceil(Math.round(Number(weightKg) * Number(rate.perKg) * 100) / 100);
  return Math.max(byWeight, Number(pieces) * Number(rate.perPiece), Number(rate.minimum));
}
const rateText = (r) =>
  [r.perKg > 0 && `${rs(r.perKg)}/kg`, r.perPiece > 0 && `${rs(r.perPiece)}/piece`, r.minimum > 0 && `minimum ${rs(r.minimum)}`].filter(Boolean).join(" · ");
const terminalLabel = (t) => (t ? `${t.cityName} · ${t.name}` : "");
const kgText = (v) => `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;

/* ------------------------------------------------------------------ book a parcel */

const EMPTY = {
  fromTerminalId: "", toTerminalId: "", senderName: "", senderPhone: "", senderCnic: "", receiverName: "", receiverPhone: "",
  receiverCnic: "", description: "", pieces: "1", weightKg: "", declaredValue: "", charge: "", chargeNote: "", receiverPays: false,
};

export function BookParcel({ me }) {
  const setup = useLoad(() => adminApi.cargoSetup(), []);
  const s = setup.data;
  const navigate = useNavigate();
  const [v, setV] = useState(EMPTY);
  const [chargeTyped, setChargeTyped] = useState(false); // the charge was changed by hand
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, x) => {
    if (k === "fromTerminalId" || k === "toTerminalId") setChargeTyped(false); // a new route: back to its rate
    setV((p) => ({ ...p, [k]: x }));
  };

  // Counter staff: their own terminal. Managers and admins choose (their own terminal first, if they have one).
  useEffect(() => {
    if (s && !v.fromTerminalId && s.myTerminalId) set("fromTerminalId", String(s.myTerminalId));
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const terminals = s?.terminals ?? [];
  const from = terminals.find((t) => String(t.id) === String(v.fromTerminalId));
  const to = terminals.find((t) => String(t.id) === String(v.toTerminalId));
  const destinations = terminals.filter((t) => !from || t.cityId !== from.cityId);
  const rate = from && to ? (s?.rates ?? []).find((r) => r.isActive && r.fromCityId === from.cityId && r.toCityId === to.cityId) ?? null : null;
  const calculated = chargeFor(rate, v.weightKg, v.pieces);
  const isManager = MANAGERS.includes(me.role);
  const lockedCharge = rate && !s?.settings?.staffCanChangeCharge && !isManager;

  // The charge follows the rate table until it is typed by hand (and always when changing it is not allowed).
  useEffect(() => {
    if (!chargeTyped || lockedCharge) setV((p) => ({ ...p, charge: calculated === null ? (rate ? "" : p.charge) : String(calculated) }));
  }, [calculated, chargeTyped, lockedCharge]); // eslint-disable-line react-hooks/exhaustive-deps

  const charge = v.charge === "" ? null : Number(v.charge);
  const lower = calculated !== null && charge !== null && charge < calculated;

  const need = (x, msg = "Required.") => (tried && !String(x ?? "").trim() ? msg : null);
  const problems = {
    fromTerminalId: need(v.fromTerminalId, "Choose the sending terminal."),
    toTerminalId: need(v.toTerminalId, "Choose where it is going."),
    senderName: need(v.senderName),
    senderPhone: tried ? phoneMessage(v.senderPhone, { required: true }) || null : null,
    senderCnic: tried ? cnicMessage(v.senderCnic, { required: true }) || null : null,
    receiverName: need(v.receiverName),
    receiverPhone: tried ? phoneMessage(v.receiverPhone, { required: true }) || null : null,
    receiverCnic: tried ? cnicMessage(v.receiverCnic) || null : null,
    description: need(v.description, "Say what it is (e.g. clothes, medicine, documents)."),
    pieces: tried && !(Number(v.pieces) >= 1) ? "At least 1." : null,
    weightKg: tried && !(Number(v.weightKg) > 0) ? "Enter the weight." : null,
    charge: tried && charge === null ? (rate ? "Enter the charge." : "No rate is set for this route: type the charge.") : null,
    chargeNote: tried && lower && !v.chargeNote.trim() ? `Lower than the rate table (${rs(calculated)}): say why.` : null,
  };
  const msg = (k) => problems[k] ?? err?.byField?.[k];

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    // Same checks as `problems` (which shows them once tried is set).
    const bad =
      !v.fromTerminalId || !v.toTerminalId || !v.senderName.trim() || !v.receiverName.trim() || !v.description.trim() ||
      phoneMessage(v.senderPhone, { required: true }) || phoneMessage(v.receiverPhone, { required: true }) ||
      cnicMessage(v.senderCnic, { required: true }) || cnicMessage(v.receiverCnic) ||
      !(Number(v.pieces) >= 1) || !(Number(v.weightKg) > 0) || charge === null || (lower && !v.chargeNote.trim());
    if (bad) return;
    const body = {
      toTerminalId: Number(v.toTerminalId),
      senderName: v.senderName.trim(), senderPhone: v.senderPhone, senderCnic: v.senderCnic,
      receiverName: v.receiverName.trim(), receiverPhone: v.receiverPhone,
      description: v.description.trim(), pieces: Number(v.pieces), weightKg: Number(v.weightKg),
      charge, payment: v.receiverPays ? "to_pay" : "paid",
    };
    if (s.canChooseTerminal) body.fromTerminalId = Number(v.fromTerminalId);
    if (v.receiverCnic.trim()) body.receiverCnic = v.receiverCnic;
    if (v.declaredValue !== "") body.declaredValue = Number(v.declaredValue);
    if (lower || (calculated !== null && charge !== calculated)) body.chargeNote = v.chargeNote.trim() || undefined;
    setBusy(true);
    setErr(null);
    let made;
    const ok = await inFormSave(() => act(async () => { made = await adminApi.cargoBook(body); }));
    setBusy(false);
    if (!ok) {
      setErr(formError(lastActError()));
      return;
    }
    // The slip page (full page, no menu) says how much to take: it has no notifications.
    navigate(`/admin/parcel-slip/${made.id}`, { state: { justBooked: true } });
  }

  const field = (name, label, input, { required, hint } = {}) => (
    <div>
      <Label htmlFor={`p-${name}`}>{label}{required ? " *" : ""}</Label>
      {input}
      {msg(name) && <p role="alert" className="mt-1 text-sm text-red-700">{msg(name)}</p>}
      {hint && <p className="mt-1 text-xs text-mute">{hint}</p>}
    </div>
  );
  const text = (name, props = {}) => <Input id={`p-${name}`} value={v[name]} onChange={(e) => set(name, e.target.value)} {...props} />;

  if (setup.err) return <Page title="Book a parcel"><ErrorNote err={setup.err} onRetry={setup.reload} /></Page>;
  if (!s) return <Page title="Book a parcel"><SkeletonDetails lines={8} /></Page>;
  if (!s.canChooseTerminal && !s.myTerminalId) {
    return (
      <Page title="Book a parcel">
        <p className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">Your account has no terminal, so parcels cannot be booked from it. Ask an admin to set your terminal (Users & staff).</p>
      </Page>
    );
  }

  return (
    <Page
      title="Book a parcel"
      intro="Fill in the sender, the receiver and the parcel. The charge comes from the cargo rates. After saving, print the slip for the sender and a label for each piece."
      actions={<Link to="/admin/parcels" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Find a parcel</Link>}
    >
      <form onSubmit={submit} noValidate className="grid max-w-4xl gap-4">
        <Section title="Route">
          <div className="grid gap-4 sm:grid-cols-2">
            {s.canChooseTerminal
              ? field("fromTerminalId", "From terminal",
                <Select id="p-fromTerminalId" value={v.fromTerminalId} onChange={(e) => { set("fromTerminalId", e.target.value); set("toTerminalId", ""); }}
                  options={[{ value: "", label: "— choose —" }, ...terminals.map((t) => ({ value: t.id, label: terminalLabel(t) }))]} />, { required: true })
              : field("fromTerminalId", "From terminal", <p id="p-fromTerminalId" className="rounded-xl border-2 border-neutral-300 bg-neutral-100 px-3 py-2 text-sm font-semibold">{terminalLabel(from) || "Your terminal"}</p>, { hint: "Your terminal." })}
            {field("toTerminalId", "To terminal",
              <Select id="p-toTerminalId" value={v.toTerminalId} onChange={(e) => set("toTerminalId", e.target.value)}
                options={[{ value: "", label: "— choose —" }, ...destinations.map((t) => ({ value: t.id, label: terminalLabel(t) }))]} />,
              { required: true, hint: to ? `The receiver collects it at ${terminalLabel(to)}${to.address ? `, ${to.address}` : ""}.` : undefined })}
          </div>
        </Section>

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Sender">
            <div className="grid gap-4">
              {field("senderName", "Name", text("senderName", { autoComplete: "off" }), { required: true })}
              {field("senderPhone", "Mobile", <PhoneInput id="p-senderPhone" className={inputCls} value={v.senderPhone} onChange={(x) => set("senderPhone", x)} messages={false} />, { required: true })}
              {field("senderCnic", "CNIC", <CnicInput id="p-senderCnic" className={inputCls} value={v.senderCnic} onChange={(x) => set("senderCnic", x)} messages={false} />, { required: true })}
            </div>
          </Section>
          <Section title="Receiver">
            <div className="grid gap-4">
              {field("receiverName", "Name", text("receiverName", { autoComplete: "off" }), { required: true })}
              {field("receiverPhone", "Mobile", <PhoneInput id="p-receiverPhone" className={inputCls} value={v.receiverPhone} onChange={(x) => set("receiverPhone", x)} messages={false} />, { required: true })}
              {field("receiverCnic", "CNIC", <CnicInput id="p-receiverCnic" className={inputCls} value={v.receiverCnic} onChange={(x) => set("receiverCnic", x)} messages={false} />, { hint: "Optional. The receiver shows the slip or their CNIC to collect." })}
            </div>
          </Section>
        </div>

        <Section title="Parcel">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("description", "What is it", text("description", { maxLength: 200, placeholder: "e.g. 2 cartons of clothes" }), { required: true })}</div>
            {field("pieces", "Pieces", text("pieces", { type: "number", min: 1, max: 500, step: 1, inputMode: "numeric" }), { required: true })}
            {field("weightKg", "Weight (kg)", text("weightKg", { type: "number", min: 0.01, step: 0.01, inputMode: "decimal" }), { required: true })}
            {field("declaredValue", "Declared value (Rs)", text("declaredValue", { type: "number", min: 0, step: 1, inputMode: "numeric" }), { hint: "Optional: what the sender says it is worth." })}
          </div>
        </Section>

        <Section title="Charge">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 text-sm">
              {!from || !to ? (
                <p className="text-mute">Choose both terminals to see the rate.</p>
              ) : rate ? (
                <p>
                  Rate {from.cityName} → {to.cityName}: <b>{rateText(rate)}</b>
                  {calculated !== null && <> · rate table charge <b>{rs(calculated)}</b></>}
                </p>
              ) : (
                <p className="rounded-lg border border-amber-500 bg-amber-50 px-2 py-1 text-amber-900">No rate is set for {from.cityName} → {to.cityName}. Type the charge{isManager ? " (or add a rate under Cargo settings)" : ""}.</p>
              )}
            </div>
            {field("charge", "Charge (Rs)",
              <Input id="p-charge" type="number" min={0} step={1} inputMode="numeric" value={v.charge} readOnly={Boolean(lockedCharge)}
                onChange={(e) => { setChargeTyped(true); set("charge", e.target.value); }} />,
              { required: true, hint: lockedCharge ? "From the rate table. Only a manager can change it." : chargeTyped && calculated !== null ? <button type="button" className="font-bold underline" onClick={() => { setChargeTyped(false); set("chargeNote", ""); }}>Use the rate table charge ({rs(calculated)})</button> : undefined })}
            {(lower || (calculated !== null && charge !== null && charge !== calculated)) &&
              field("chargeNote", lower ? "Why is it lower?" : "Note (optional)", text("chargeNote", { maxLength: 300, placeholder: lower ? "e.g. regular customer, manager agreed" : "" }), { required: lower })}
            <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-neutral-400 p-3 text-sm font-semibold sm:col-span-2">
              <input type="checkbox" id="p-receiverPays" checked={v.receiverPays} onChange={(e) => set("receiverPays", e.target.checked)} className="h-5 w-5 accent-black" />
              Receiver pays on collection (nothing is paid now)
            </label>
            <p className="text-lg font-extrabold sm:col-span-2" aria-live="polite">
              {charge === null ? "" : v.receiverPays ? `Receiver pays ${rs(charge)} at ${to?.cityName ?? "the destination"}` : `Take ${rs(charge)} from the sender now`}
            </p>
          </div>
        </Section>

        <FormError err={err} />
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Book parcel"}</Btn>
          <Btn onClick={() => { setV({ ...EMPTY, fromTerminalId: v.fromTerminalId }); setChargeTyped(false); setTried(false); setErr(null); }}>Clear</Btn>
        </div>
      </form>
    </Page>
  );
}

/* ------------------------------------------------------------------ find a parcel */

function ParcelDetail({ id, me, onClose, onChanged }) {
  const p = useLoad(() => adminApi.cargoParcel(id), [id]);
  const [openForm, form] = useForm();
  const [handing, setHanding] = useState(false);
  const x = p.data;
  const canCancel = x && x.status === "booked" && (MANAGERS.includes(me.role) || x.fromTerminalId === me.terminalId);
  // At the destination: hand over or return a parcel waiting there.
  const atDestination = x && x.status === "arrived" && (MANAGERS.includes(me.role) || x.toTerminalId === me.terminalId);

  const cancel = () =>
    openForm({
      title: `Cancel parcel ${x.parcelNo}`,
      note: x.payment === "paid" ? `The sender paid ${rs(x.charge)}: give it back in cash.` : "Nothing was paid (the receiver was to pay on collection).",
      fields: [{ name: "reason", label: "Reason", type: "textarea", required: true, rows: 2 }],
      submitLabel: "Cancel parcel",
      onSubmit: async (b) => {
        let res;
        const ok = await act(async () => { res = await adminApi.cargoCancel(x.id, b.reason); }, `Parcel ${x.parcelNo} cancelled`, x.payment === "paid" ? `Give back ${rs(x.charge)} to the sender.` : "");
        if (ok) { p.setData(res.data); onChanged?.(); }
        return ok;
      },
    });

  const row = (label, value) => (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-neutral-200 py-1.5 text-sm last:border-0">
      <span className="text-mute">{label}</span>
      <span className="font-semibold break-words">{value}</span>
    </div>
  );

  return (
    <Modal wide title={x ? `Parcel ${x.parcelNo}` : "Parcel"} onClose={onClose}>
      <ErrorNote err={p.err} onRetry={p.reload} />
      {!x ? <SkeletonDetails /> : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ParcelStatus s={x.status} listed={Boolean(x.listId)} /> <PaymentBadge p={x} />
            <span className="text-sm text-mute">Booked {fmtDT(x.createdAt)} by {x.bookedByName}</span>
          </div>
          {x.status === "cancelled" && <p className="rounded-xl border border-red-400 bg-red-50 p-2 text-sm text-red-900">Cancelled: {x.cancelledReason}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              {row("From", `${x.fromCity} · ${x.fromTerminal}`)}
              {row("To", `${x.toCity} · ${x.toTerminal}`)}
              {row("Sender", <>{x.senderName}<br />{phoneText(x.senderPhone)} · CNIC {x.senderCnic}</>)}
              {row("Receiver", <>{x.receiverName}<br />{phoneText(x.receiverPhone)}{x.receiverCnic ? ` · CNIC ${x.receiverCnic}` : ""}</>)}
            </div>
            <div>
              {row("What", x.description)}
              {row("Pieces · weight", `${x.pieces} · ${kgText(x.weightKg)}`)}
              {x.declaredValue !== null && row("Declared value", rs(x.declaredValue))}
              {row("Charge", <>{rs(x.charge)}{x.calculatedCharge !== null && x.calculatedCharge !== x.charge ? <span className="font-normal text-mute"> (rate table {rs(x.calculatedCharge)}{x.chargeNote ? `: ${x.chargeNote}` : ""})</span> : null}</>)}
              {x.list && row("Cargo list", <><a className="underline" href={`/admin/cargo-list/${x.list.id}`} target="_blank" rel="noreferrer">{x.list.listNo}</a> · bus {x.list.busNo} · leaves {fmtDT(x.list.leavesAt)}{x.list.voucherNo ? ` · voucher ${x.list.voucherNo}` : " · still loading"}</>)}
              {x.arrivedAt && row("Received", `${fmtDT(x.arrivedAt)} at ${x.toCity}${x.arrivedByName ? `, by ${x.arrivedByName}` : ""}`)}
              {x.status === "delivered" && row("Handed over", <>{fmtDT(x.deliveredAt)} to <b>{x.collectedByName}</b> (CNIC {x.collectedByCnic}, {x.collectedProof === "slip" ? "slip shown" : "receiver's own CNIC"}){x.deliveredByName ? `, by ${x.deliveredByName}` : ""}</>)}
              {x.status === "returned" && row("Returned", `${fmtDT(x.returnedAt)}: ${x.returnedReason}`)}
              {row("Payment", x.payment === "paid" ? `Paid at booking, ${fmtDT(x.paidAt)}` : x.paidAt ? `Paid on collection, ${fmtDT(x.paidAt)}` : `Receiver pays ${rs(x.charge)} on collection`)}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-bold">History</h3>
            <ol className="grid gap-2">
              {x.events.map((e) => (
                <li key={e.id} className="rounded-xl border border-neutral-300 p-2 text-sm">
                  <b>{EVENT[e.event] ?? e.event}</b> · {fmtDT(e.createdAt)}{e.cityName ? ` · ${e.cityName}` : ""} · {e.byName}
                  {e.note && <div className="text-mute">{e.note}</div>}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap gap-2">
            {x.status !== "cancelled" && <Link to={`/admin/parcel-slip/${x.id}`} className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm">Print slip</Link>}
            {x.status !== "cancelled" && <Link to={`/admin/parcel-labels/${x.id}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Print labels ({x.pieces})</Link>}
            {canCancel && <Btn kind="danger" onClick={cancel}>Cancel parcel</Btn>}
            {atDestination && <Btn kind="primary" onClick={() => setHanding(true)}>Hand over</Btn>}
            {atDestination && <Btn onClick={() => openForm(returnForm(x, () => { p.reload(); onChanged?.(); }))}>Return to sender…</Btn>}
            {x.status === "delivered" && <Link to={`/admin/parcel-receipt/${x.id}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Delivery receipt</Link>}
          </div>
        </div>
      )}
      {handing && <HandOverWindow parcel={x} onClose={() => { setHanding(false); p.reload(); onChanged?.(); }} />}
      {form}
    </Modal>
  );
}

export function Parcels({ me }) {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [applied, setApplied] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [side, setSide] = useState("any");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const setup = useLoad(() => adminApi.cargoSetup(), []);
  const list = useLoad(
    () => adminApi.cargoParcels({ q: applied || undefined, status, terminalId, side: terminalId ? side : undefined, from, to, page, limit: 25 }),
    [applied, status, terminalId, side, from, to, page],
  );
  const rows = list.data?.data;

  // Opening a link with ?q= (a slip's QR) while this page is already open: search for it.
  const urlQ = sp.get("q") ?? "";
  useEffect(() => {
    if (urlQ !== applied) {
      setQ(urlQ);
      setApplied(urlQ);
      setPage(1);
    }
  }, [urlQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // A parcel number (typed, or a slip's QR scanned into the box) that finds exactly one parcel opens it.
  useEffect(() => {
    if (rows?.length === 1 && /CG-?\d/i.test(applied) && page === 1) setOpenId(rows[0].id);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(q.trim());
    setSp(q.trim() ? { q: q.trim() } : {}, { replace: true });
  };

  return (
    <Page
      title="Parcels"
      intro="Find a parcel by its number (or scan the QR on the slip), the sender's or receiver's mobile or CNIC, a name, or a cargo list number (CL-…) for the parcels on that bus."
      actions={<Link to="/admin/book-parcel" className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm">+ Book a parcel</Link>}
    >
      <form onSubmit={search} className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <Label htmlFor="pc-q">Search</Label>
          <Input id="pc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="CG-0000123, 0300 1234567, CNIC or name" autoFocus />
        </div>
        <Btn kind="primary" type="submit">Search</Btn>
        {applied && <Btn onClick={() => { setQ(""); setApplied(""); setSp({}, { replace: true }); }}>Clear</Btn>}
      </form>
      <Filters>
        <div>
          <Label htmlFor="pc-s">Status</Label>
          <Select id="pc-s" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: "", label: "All" }, ...Object.entries(PARCEL_STATUS).map(([k, [l]]) => ({ value: k, label: l }))]} />
        </div>
        <div>
          <Label htmlFor="pc-t">Terminal</Label>
          <Select id="pc-t" value={terminalId} onChange={(e) => { setTerminalId(e.target.value); setPage(1); }}
            options={[{ value: "", label: "All" }, ...(setup.data?.terminals ?? []).map((t) => ({ value: t.id, label: terminalLabel(t) }))]} />
        </div>
        {terminalId && (
          <div>
            <Label htmlFor="pc-side">Parcels</Label>
            <Select id="pc-side" value={side} onChange={(e) => { setSide(e.target.value); setPage(1); }}
              options={[{ value: "any", label: "Sent or arriving" }, { value: "from", label: "Sent from here" }, { value: "to", label: "Arriving here" }]} />
          </div>
        )}
        <div>
          <Label htmlFor="pc-from">Booked from</Label>
          <Input id="pc-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <Label htmlFor="pc-to">to</Label>
          <Input id="pc-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <Btn onClick={list.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={rows}
        numbered={{ noun: ["parcel", "parcels"], pagination: list.data?.pagination }}
        empty={applied ? `No parcel found for "${applied}".` : "No parcels yet."}
        cols={[
          { key: "parcelNo", label: "Parcel", render: (r) => <button type="button" className="font-mono font-bold underline" onClick={() => setOpenId(r.id)}>{r.parcelNo}</button> },
          { key: "createdAt", label: "Booked", render: (r) => fmtDT(r.createdAt) },
          { key: "route", label: "From → to", render: (r) => `${r.fromCity} → ${r.toCity}` },
          { key: "sender", label: "Sender", render: (r) => <>{r.senderName}<br /><span className="text-xs text-mute">{phoneText(r.senderPhone)}</span></> },
          { key: "receiver", label: "Receiver", render: (r) => <>{r.receiverName}<br /><span className="text-xs text-mute">{phoneText(r.receiverPhone)}</span></> },
          { key: "size", label: "Pieces · kg", render: (r) => `${r.pieces} · ${kgText(r.weightKg)}` },
          { key: "charge", label: "Charge", render: (r) => <><b>{rs(r.charge)}</b><br /><PaymentBadge p={r} /></> },
          { key: "status", label: "Status", render: (r) => <ParcelStatus s={r.status} listed={Boolean(r.listId)} /> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={setPage} />
      {openId && <ParcelDetail id={openId} me={me} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ settings (admin) */

function SettingsForm({ settings, onSaved }) {
  const [v, setV] = useState({
    rulesText: settings.rulesText ?? "",
    notAllowedText: settings.notAllowedText ?? "",
    overdueDays: String(settings.overdueDays ?? 7),
    staffCanChangeCharge: Boolean(settings.staffCanChangeCharge),
  });
  const [busy, setBusy] = useState(false);
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await act(
      () => adminApi.cargoSaveSettings({ ...v, rulesText: v.rulesText.trim(), notAllowedText: v.notAllowedText.trim(), overdueDays: Number(v.overdueDays) }),
      "Cargo settings saved",
    );
    setBusy(false);
    if (ok) onSaved();
  };
  return (
    <form onSubmit={save} className="grid gap-4">
      <div>
        <Label htmlFor="cs-rules">Compensation rules (printed on every slip)</Label>
        <textarea id="cs-rules" rows={5} maxLength={3000} className={inputCls} value={v.rulesText} onChange={(e) => set("rulesText", e.target.value)}
          placeholder="e.g. New Khan is not responsible for items not declared. Compensation for a lost parcel is at most Rs … or the declared value, whichever is lower. Claims within 7 days with this slip." />
        {!v.rulesText.trim() && <p className="mt-1 text-xs text-amber-800">Empty: the slip prints no compensation rules.</p>}
      </div>
      <div>
        <Label htmlFor="cs-na">Items not accepted (printed on every slip)</Label>
        <textarea id="cs-na" rows={2} maxLength={1500} className={inputCls} value={v.notAllowedText} onChange={(e) => set("notAllowedText", e.target.value)} placeholder="e.g. Cash, jewellery, gas cylinders, fuel, weapons, illegal items." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cs-od">Overdue after (days)</Label>
          <Input id="cs-od" type="number" min={1} max={90} step={1} value={v.overdueDays} onChange={(e) => set("overdueDays", e.target.value)} />
          <p className="mt-1 text-xs text-mute">A parcel not collected after this many days is listed as overdue (part 3).</p>
        </div>
        <label className="flex items-center gap-2 self-center text-sm font-semibold">
          <input type="checkbox" checked={v.staffCanChangeCharge} onChange={(e) => set("staffCanChangeCharge", e.target.checked)} className="h-5 w-5 accent-black" />
          Counter staff may change the charge (a lower charge always needs a reason)
        </label>
      </div>
      <div><Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Btn></div>
    </form>
  );
}

export function CargoSettings() {
  const setup = useLoad(() => adminApi.cargoSetup(), []);
  const [openForm, form] = useForm();
  const s = setup.data;
  const cityOpts = useMemo(() => (s?.cities ?? []).map((c) => ({ value: c.id, label: c.name })), [s]);

  const rateForm = (r) =>
    openForm({
      title: r ? `Rate · ${r.fromCity} → ${r.toCity}` : "Add a cargo rate",
      note: "Charge = the higher of (weight × rate per kg) and (pieces × rate per piece), never below the minimum. Leave a rate at 0 to not use it. Rates go one way: add the return direction separately.",
      fields: [
        { name: "fromCityId", label: "From city", type: "select", numeric: true, required: true, options: cityOpts },
        { name: "toCityId", label: "To city", type: "select", numeric: true, required: true, options: cityOpts },
        { name: "perKg", label: "Rate per kg (Rs)", type: "number", min: 0, step: 1, required: true },
        { name: "perPiece", label: "Rate per piece (Rs)", type: "number", min: 0, step: 1, required: true },
        { name: "minimum", label: "Minimum charge (Rs)", type: "number", min: 0, step: 1, required: true },
        { name: "isActive", label: "", type: "checkbox", checkLabel: "In use" },
      ],
      initial: r ? { ...r } : { perKg: 0, perPiece: 0, minimum: 0, isActive: true },
      onSubmit: (b) => act(() => (r ? adminApi.cargoUpdateRate(r.id, b) : adminApi.cargoCreateRate(b)), r ? "Rate saved" : "Rate added").then((ok) => (ok && setup.reload(), ok)),
    });

  return (
    <Page title="Cargo settings" intro="The rates the booking form uses, and the rules printed on every parcel slip.">
      <ErrorNote err={setup.err} onRetry={setup.reload} />
      {!s ? <SkeletonTable cols={["Rate", "", ""]} rows={4} /> : (
        <>
          <Section title="Rates" actions={<Btn kind="primary" small onClick={() => rateForm(null)}>+ Add rate</Btn>}>
            <Table
              rows={s.rates}
              empty="No rates yet. Without a rate, staff type the charge for every parcel."
              cols={[
                { key: "pair", label: "From → to", render: (r) => <b>{r.fromCity} → {r.toCity}</b> },
                { key: "perKg", label: "Per kg", render: (r) => (r.perKg ? rs(r.perKg) : "–") },
                { key: "perPiece", label: "Per piece", render: (r) => (r.perPiece ? rs(r.perPiece) : "–") },
                { key: "minimum", label: "Minimum", render: (r) => (r.minimum ? rs(r.minimum) : "–") },
                { key: "example", label: "10 kg, 1 piece", render: (r) => rs(chargeFor(r, 10, 1)) },
                { key: "isActive", label: "Status", render: (r) => (r.isActive ? <Badge tone="green">in use</Badge> : <Badge tone="red">off</Badge>) },
                { key: "a", label: "", render: (r) => <Btn small onClick={() => rateForm(r)}>Edit</Btn> },
              ]}
            />
          </Section>
          <Section title="Slip text and rules">
            <SettingsForm key={s.settings.updatedAt} settings={s.settings} onSaved={setup.reload} />
          </Section>
        </>
      )}
      {form}
    </Page>
  );
}
