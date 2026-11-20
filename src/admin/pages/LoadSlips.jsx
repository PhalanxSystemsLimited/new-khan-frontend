/**
 * Extra load slips (LD-…): a passenger's extra luggage, paid for and tied to their booking (backend: loads.service.js).
 *   AddLoadWindow   counter staff / managers: find the booking (reference, ticket number, scanned ticket QR or LD
 *                   number), see its slips, add one, print it. Opened from the Counter screen and from a booking.
 *   LoadForm        the fields of a slip: amount (required), bags, weight, note. Also on the conductor screen.
 *   LoadSlipList    a booking's or a voucher's slips, with Print and (when allowed) Cancel with a reason.
 *   LoadSlipPrint   /admin/load-slip/:id   the printed slip (80 / 58 mm), with the ticket's QR.
 * The server checks every rule; the buttons only hide what this person cannot do.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../api";
import { useMe } from "../../booking/useRole";
import {
  act, Badge, Btn, ErrorNote, fmtDT, formError, FormError, inFormSave, Input, Label, lastActError, Modal, SkeletonDetails, StatusBadge, useForm, useLoad,
} from "../ui";
import { paperStyle, usePaper } from "./CargoPrint";

const MANAGERS = ["manager", "admin", "super_admin"];
const money = (n) => Number(n).toLocaleString("en-US");
const kg = (v) => `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;
const bags = (n) => `${n} bag${n === 1 ? "" : "s"}`;
const inputCls = "w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black";
/** "Lahore counter" / "on the bus after Sargodha" */
export const takenWhere = (s) => (s.takenBy === "conductor" ? `on the bus after ${s.stopCity}` : `${s.stopCity} counter`);

/* ------------------------------------------------------------------ the form */

/** Amount (required), bags, weight and note. onSave(body) resolves when saved (throws to show the error here). */
export function LoadForm({ onSave, idPrefix = "lf", submitLabel = "Save and print slip" }) {
  const [v, setV] = useState({ amount: "", pieces: "", weightKg: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const amountOk = /^\d+$/.test(v.amount.trim()) && Number(v.amount) >= 1 && Number(v.amount) <= 100000;

  async function submit(e) {
    e.preventDefault();
    if (!amountOk) {
      setErr({ message: "Enter the amount taken (Rs), 1 to 100,000.", byField: { amount: "Enter the amount taken (Rs)." } });
      document.getElementById(`${idPrefix}-amount`)?.focus();
      return;
    }
    const body = { amount: Number(v.amount) };
    if (v.pieces.trim()) body.pieces = Number(v.pieces);
    if (v.weightKg.trim()) body.weightKg = Math.round(Number(v.weightKg) * 10) / 10;
    if (v.note.trim()) body.note = v.note.trim();
    setBusy(true);
    setErr(null);
    const ok = await inFormSave(() => act(() => onSave(body)));
    setBusy(false);
    if (ok) setV({ amount: "", pieces: "", weightKg: "", note: "" });
    else setErr(formError(lastActError()));
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 rounded-2xl border-2 border-black p-4">
      <p className="font-bold">Add extra load</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_7rem]">
        <div>
          <Label htmlFor={`${idPrefix}-amount`}>Amount taken (Rs) *</Label>
          <Input id={`${idPrefix}-amount`} inputMode="numeric" autoComplete="off" value={v.amount} onChange={set("amount")} placeholder="500" />
          {err?.byField?.amount && <p role="alert" className="mt-1 text-sm text-red-700">{err.byField.amount}</p>}
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-pieces`}>Bags</Label>
          <Input id={`${idPrefix}-pieces`} type="number" min="1" max="99" value={v.pieces} onChange={set("pieces")} />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-weight`}>Weight (kg)</Label>
          <Input id={`${idPrefix}-weight`} type="number" min="0.1" step="0.1" value={v.weightKg} onChange={set("weightKg")} />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-note`}>Note</Label>
        <Input id={`${idPrefix}-note`} maxLength={200} value={v.note} onChange={set("note")} placeholder="2 extra bags" />
      </div>
      <FormError err={err && !err.byField?.amount ? err : null} />
      <div>
        <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Btn>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ the list */

/**
 * slips: from the server. canCancel(slip) -> boolean. onChanged: reload after a cancel.
 * Cancelled slips stay in the list (struck through, with the reason).
 */
export function LoadSlipList({ slips, canCancel = () => false, onChanged, empty = "No extra load on this booking.", showBooking = false }) {
  const [openForm, form] = useForm();
  if (!slips?.length) return <p className="rounded-xl border border-dashed border-neutral-400 p-3 text-sm text-mute">{empty}</p>;
  const cancel = (s) =>
    openForm({
      title: `Cancel ${s.slipNo}`,
      note: `Rs ${money(s.amount)} taken ${takenWhere(s)}. Give the money back if it was paid. The slip stays in the history, marked cancelled.`,
      fields: [{ name: "reason", label: "Why is it cancelled?", type: "textarea", required: true, rows: 2 }],
      submitLabel: "Cancel the slip",
      onSubmit: ({ reason }) => act(() => adminApi.cancelLoadSlip(s.id, reason), `${s.slipNo} cancelled`).then((ok) => (ok && onChanged?.(), ok)),
    });
  return (
    <>
      <ul className="grid gap-2" data-load-slips>
        {slips.map((s) => {
          const off = s.status === "cancelled";
          return (
            <li key={s.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${off ? "border-neutral-300 bg-neutral-50 text-neutral-500" : "border-neutral-300 bg-white"}`}>
              <div>
                <p>
                  <b className={`font-mono ${off ? "line-through" : "text-black"}`}>{s.slipNo}</b>{" "}
                  <b className={off ? "line-through" : "text-black"}>Rs {money(s.amount)}</b>
                  {s.pieces ? ` · ${bags(s.pieces)}` : ""}{s.weightKg ? ` · ${kg(s.weightKg)}` : ""}
                  {showBooking && s.pnr ? <> · booking <span className="font-mono">{s.pnr}</span>{s.contactName ? ` (${s.contactName})` : ""}</> : null}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
                <p className="text-xs text-mute">
                  {takenWhere(s)} · {s.createdByName} · {fmtDT(s.createdAt)}
                  {s.voucherNo ? ` · on voucher ${s.voucherNo}` : ""}
                </p>
                {off && <p className="text-xs"><Badge tone="red">cancelled</Badge> {s.cancelReason} ({s.cancelledByName}, {fmtDT(s.cancelledAt)})</p>}
              </div>
              <div className="flex gap-2">
                {!off && <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/load-slip/${s.id}`} target="_blank" rel="noreferrer">Print</a>}
                {!off && canCancel(s) && <Btn small kind="danger" onClick={() => cancel(s)}>Cancel…</Btn>}
              </div>
            </li>
          );
        })}
      </ul>
      {form}
    </>
  );
}

/** Who may press Cancel (the server decides in the end). */
export function useCanCancelSlip() {
  const me = useMe();
  return (s) => {
    if (!me || s.status !== "active") return false;
    if (MANAGERS.includes(me.role)) return true;
    if (s.takenBy === "counter") return me.role === "agent" && me.terminalId === s.terminalId && !s.voucherId;
    return me.role === "conductor";
  };
}

/* ------------------------------------------------------------------ the counter window */

/** initial: a booking reference / ticket number to open straight away (from a booking). */
export function AddLoadWindow({ initial = "", onClose, onChanged }) {
  const [q, setQ] = useState(initial);
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null); // the slip just added: its Print button
  const box = useRef(null);
  const canCancel = useCanCancelSlip();

  async function find(text, keepSaved = false) {
    setErr("");
    if (!keepSaved) setSaved(null);
    setBusy(true);
    try {
      setB(await adminApi.findLoadBooking(text));
    } catch (e) {
      setB(null);
      setErr(e.message || "Could not find the booking");
    }
    setBusy(false);
  }
  useEffect(() => {
    if (initial) find(initial);
    else box.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = () => {
    if (b) find(b.pnr, true);
    onChanged?.();
  };

  return (
    <Modal wide title="Add extra load" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) find(q.trim()); }} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 grow">
          <Label htmlFor="ld-q">Booking reference, ticket number, or scan the ticket</Label>
          {/* A plain input: the shared Input does not pass a ref (the box is focused for the scanner). */}
          <input id="ld-q" ref={box} className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="NK4F7Q2M or NK-20261120-000123" autoComplete="off" />
        </div>
        <Btn kind="primary" type="submit" disabled={busy || !q.trim()}>{busy ? "Finding…" : "Find"}</Btn>
      </form>
      {err && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{err}</p>}
      {busy && !b && <div className="mt-4"><SkeletonDetails lines={3} /></div>}
      {b && (
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-neutral-300 bg-neutral-50 p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <b className="font-mono text-lg text-black">{b.pnr}</b> <StatusBadge s={b.status} />
              <span className="text-mute">{b.contactName} · {b.contactPhone}</span>
            </p>
            <p className="mt-1">
              <b className="text-black">{b.boardingCity} → {b.droppingCity}</b> · {b.routeName} · bus {b.busNo} · boards {fmtDT(b.boardingAt)}
            </p>
            <p className="mt-1 text-mute">
              {b.passengers.map((p) => `${p.seat} ${p.name}`).join(" · ")}
            </p>
          </div>
          {saved && (
            <p className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-green-600 bg-green-50 p-3 text-green-900" role="status">
              <span>Saved <b className="font-mono">{saved.slipNo}</b>: Rs {money(saved.amount)}. Take the money and give the customer the slip.</span>
              <a className="btn btn-gold !min-h-9 !px-3 !py-1 text-sm" href={`/admin/load-slip/${saved.id}`} target="_blank" rel="noreferrer">Print slip</a>
            </p>
          )}
          {b.canAdd ? (
            <LoadForm
              onSave={async (body) => {
                const s = await adminApi.addLoadSlip({ bookingId: b.bookingId, ...body });
                setSaved(s);
                changed();
              }}
            />
          ) : (
            <p className="rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">{b.whyNot}</p>
          )}
          <div>
            <h3 className="mb-2 font-bold">Extra load on this booking</h3>
            <LoadSlipList slips={b.slips} canCancel={canCancel} onChanged={changed} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ printing */

export function LoadSlipPrint() {
  const { id } = useParams();
  const p = useLoad(() => adminApi.loadSlip(id), [id], { fresh: true });
  const x = p.data;
  const { width, chooser } = usePaper(x ? `Load slip ${x.slipNo}` : "Load slip");
  if (p.err) return <div className="p-6"><ErrorNote err={p.err} onRetry={p.reload} /></div>;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const off = x.status === "cancelled";
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const row = (label, value) => (value ? <div className="flex justify-between gap-2"><span>{label}</span><span className="text-right font-bold">{value}</span></div> : null);
  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        {chooser}
        <Btn kind="primary" onClick={() => window.print()} disabled={off}>Print slip</Btn>
        <Link to="/admin" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      {off && <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-red-400 bg-red-50 p-2 text-center text-sm text-red-900">This slip is CANCELLED ({x.cancelReason}).</p>}
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={paperStyle(width)}>
        <div className="text-center font-bold">NEW KHAN</div>
        <div className="text-center">EXTRA LOAD SLIP</div>
        <div className="text-center text-[1.5em] font-extrabold tracking-wide">{x.slipNo}</div>
        {off && <div className="my-1 border-2 border-black text-center font-extrabold">CANCELLED</div>}
        {dash}
        {row("Booking", x.pnr)}
        {x.passengers.map((p, i) => <div key={i} className="flex justify-between gap-2"><span>{i === 0 ? "Passenger" : ""}</span><span className="text-right">{p.seat} {p.name}</span></div>)}
        {row("Route", `${x.boardingCity} → ${x.droppingCity}`)}
        {row("Bus", x.busNo)}
        {row("Departs", fmtDT(x.boardingAt))}
        {dash}
        {row("Bags", x.pieces ? String(x.pieces) : null)}
        {row("Weight", x.weightKg ? kg(x.weightKg) : null)}
        {x.note && <div>{x.note}</div>}
        <div className="my-1 border-2 border-black text-center text-[1.3em] font-extrabold">PAID Rs {money(x.amount)}</div>
        <div className="text-[0.9em]">Taken {x.takenBy === "counter" ? "at " : ""}{takenWhere(x)} by {x.createdByName}, {fmtDT(x.createdAt)}</div>
        {x.qrSvg && (
          <div className="mt-2 text-center">
            <div className="mx-auto" style={{ width: width === 58 ? "26mm" : "30mm" }} dangerouslySetInnerHTML={{ __html: x.qrSvg }} />
            <div className="text-[0.85em]">Ticket {x.pnr}: staff scan to check</div>
          </div>
        )}
        {dash}
        <div className="text-center text-[0.85em]">Keep this slip with your ticket.</div>
      </div>
    </div>
  );
}
