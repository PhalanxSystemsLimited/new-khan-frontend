/**
 * Printing for cargo (full page, no admin menu), on the same 80 / 58 mm receipt printers as the vouchers:
 *   ParcelSlip    /admin/parcel-slip/:id    the sender's slip: parcel number + QR, route, sender, receiver, parcel,
 *                                           charge (PAID / TO PAY), the compensation rules and items not accepted.
 *                                           The sender sends a picture of it to the receiver, who shows it to collect.
 *   ParcelLabels  /admin/parcel-labels/:id  one label per piece ("2 of 3"), to stick on the parcel.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { adminApi } from "../api";
import { Btn, ErrorNote, Select, useLoad, usePageTitle } from "../ui";
import { phoneText } from "./cargoShared";

const TZ = "Asia/Karachi";
const stamp = (v) =>
  new Date(v).toLocaleString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
const money = (n) => Number(n).toLocaleString("en-US");
/** 35202-1234567-1 -> 35202-*******-1 (the slip is photographed and sent on). */
const maskCnic = (v) => (v ? String(v).replace(/^(\d{5})-?\d{7}-?(\d)$/, "$1-*******-$2") : "");
const kg = (v) => `${Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;

/** Paper width chooser + the page size for printing. */
function usePaper(title) {
  const [width, setWidth] = useState(80);
  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `@page { size: ${width}mm auto; margin: 3mm; } @media print { body { background: #fff !important; } .slip-tools { display: none !important; } .label-break { break-after: page; } }`;
    document.head.appendChild(s);
    return () => s.remove();
  }, [width]);
  usePageTitle(title, { print: true });
  const chooser = (
    <Select aria-label="Paper width" className="!w-auto" value={width} onChange={(e) => setWidth(Number(e.target.value))}
      options={[{ value: 80, label: "80 mm paper" }, { value: 58, label: "58 mm paper" }]} />
  );
  return { width, chooser };
}

const paperStyle = (width) => ({ width: `${width - 6}mm`, fontSize: width === 58 ? "8.5pt" : "10pt", lineHeight: 1.35 });

export function ParcelSlip() {
  const { id } = useParams();
  const justBooked = Boolean(useLocation().state?.justBooked);
  const p = useLoad(() => adminApi.cargoSlip(id), [id]);
  const x = p.data;
  const { width, chooser } = usePaper(x ? `Parcel ${x.parcelNo}` : "Parcel slip");

  if (p.err) return <div className="p-6"><ErrorNote err={p.err} onRetry={p.reload} /></div>;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const row = (label, value, bold) => (
    <div className="flex justify-between gap-2"><span>{label}</span><span className={`text-right ${bold ? "font-bold" : ""}`}>{value}</span></div>
  );

  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        {chooser}
        <Btn kind="primary" onClick={() => window.print()} disabled={x.status === "cancelled"}>Print slip</Btn>
        <Link to={`/admin/parcel-labels/${x.id}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Labels ({x.pieces})</Link>
        <Link to="/admin/book-parcel" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Book another</Link>
        <Link to={`/admin/parcels?q=${x.parcelNo}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      {justBooked && x.status !== "cancelled" && (
        <p role="status" className="slip-tools mx-auto mb-3 max-w-md rounded-xl border-2 border-green-700 bg-green-50 p-3 text-center text-sm text-green-900">
          <b>Parcel {x.parcelNo} booked.</b>{" "}
          {x.payment === "paid" ? <>Take <b>Rs {money(x.charge)}</b> from the sender.</> : <>Nothing to take now: the receiver pays <b>Rs {money(x.charge)}</b> on collection.</>}{" "}
          Print the slip for the sender and {x.pieces === 1 ? "the label" : `the ${x.pieces} labels`} for the parcel.
        </p>
      )}
      {x.status === "cancelled" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-red-400 bg-red-50 p-2 text-center text-sm text-red-900">
          This parcel is CANCELLED ({x.cancelledReason}). Do not give this slip out.
        </p>
      )}
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={paperStyle(width)}>
        <div className="text-center">
          <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
          <div className="text-[1.15em] font-bold">Cargo Slip</div>
          <div className="mt-1 text-[1.6em] font-extrabold tracking-wide">{x.parcelNo}</div>
          {x.status === "cancelled" && <div className="font-bold">*** CANCELLED ***</div>}
        </div>
        {dash}
        {row("Booked", stamp(x.createdAt))}
        <div className="font-bold">From: {x.fromCity} · {x.fromTerminal}</div>
        {x.fromPhone && <div>Tel {x.fromPhone}</div>}
        <div className="mt-1 font-bold">To: {x.toCity} · {x.toTerminal}</div>
        {x.toAddress && <div>{x.toAddress}</div>}
        {x.toPhone && <div>Tel {x.toPhone}</div>}
        {dash}
        <div className="font-bold">Sender</div>
        <div>{x.senderName}</div>
        <div>{phoneText(x.senderPhone)} · CNIC {maskCnic(x.senderCnic)}</div>
        <div className="mt-1 font-bold">Receiver</div>
        <div>{x.receiverName}</div>
        <div>{phoneText(x.receiverPhone)}{x.receiverCnic ? ` · CNIC ${maskCnic(x.receiverCnic)}` : ""}</div>
        {dash}
        <div>{x.description}</div>
        {row("Pieces", x.pieces)}
        {row("Weight", kg(x.weightKg))}
        {x.declaredValue !== null && row("Declared value", `Rs ${money(x.declaredValue)}`)}
        {dash}
        {row("Charge", `Rs ${money(x.charge)}`, true)}
        <div className="my-1 border-2 border-black py-1 text-center text-[1.2em] font-extrabold">
          {x.payment === "paid" ? "PAID" : x.paidAt ? "PAID ON COLLECTION" : `TO PAY Rs ${money(x.charge)}`}
        </div>
        {row("Booked by", x.bookedByName)}
        {dash}
        <div className="font-bold">To collect</div>
        <div>Bring this slip (or a picture of it) or your CNIC to New Khan {x.toCity}, {x.toTerminal}.</div>
        {x.rulesText && (
          <>
            {dash}
            <div className="font-bold">Compensation rules</div>
            <div className="whitespace-pre-line">{x.rulesText}</div>
          </>
        )}
        {x.notAllowedText && (
          <>
            {dash}
            <div className="font-bold">Not accepted</div>
            <div className="whitespace-pre-line">{x.notAllowedText}</div>
          </>
        )}
        {dash}
        <div className="mt-2">Sender sig: ______________</div>
        {x.qrSvg && (
          <div className="mt-2 text-center">
            {/* SVG made by the server's QR library from this parcel's link (staff sign in to open it). */}
            <div className="mx-auto" style={{ width: width === 58 ? "28mm" : "34mm" }} dangerouslySetInnerHTML={{ __html: x.qrSvg }} />
            <div className="mt-1">{x.parcelNo}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ParcelLabels() {
  const { id } = useParams();
  const p = useLoad(() => adminApi.cargoSlip(id), [id]);
  const x = p.data;
  const { width, chooser } = usePaper(x ? `Labels ${x.parcelNo}` : "Parcel labels");

  if (p.err) return <div className="p-6"><ErrorNote err={p.err} onRetry={p.reload} /></div>;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const n = x.pieces;

  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        {chooser}
        <Btn kind="primary" onClick={() => window.print()} disabled={x.status === "cancelled"}>Print {n} label{n === 1 ? "" : "s"}</Btn>
        <Link to={`/admin/parcel-slip/${x.id}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Slip</Link>
        <Link to={`/admin/parcels?q=${x.parcelNo}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      {x.status === "cancelled" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-red-400 bg-red-50 p-2 text-center text-sm text-red-900">This parcel is CANCELLED.</p>
      )}
      <div className="mx-auto grid gap-3 print:block" style={{ width: `${width - 6}mm` }}>
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className={`bg-white p-2 font-mono text-black print:p-0 ${i < n - 1 ? "label-break" : ""}`} style={paperStyle(width)}>
            <div className="text-center font-bold">NEW KHAN CARGO</div>
            <div className="text-center text-[1.6em] font-extrabold tracking-wide">{x.parcelNo}</div>
            <div className="text-center text-[1.3em] font-extrabold">Piece {i + 1} of {n}</div>
            <div className="my-1 border-t border-dashed border-black" />
            <div className="text-[1.25em] font-extrabold">TO: {x.toCity.toUpperCase()}</div>
            <div>{x.toTerminal}</div>
            <div className="mt-1">For: {x.receiverName}</div>
            <div>From: {x.fromCity} · {x.senderName}</div>
            {x.payment !== "paid" && !x.paidAt && <div className="mt-1 border-2 border-black text-center font-extrabold">TO PAY Rs {money(x.charge)}</div>}
            {x.qrSvg && <div className="mx-auto mt-2" style={{ width: width === 58 ? "24mm" : "28mm" }} dangerouslySetInnerHTML={{ __html: x.qrSvg }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CargoListPrint  /admin/cargo-list/:id   the bus's cargo list for the conductor: list number + QR, bus, route,
 * terminal, voucher, totals ("parcels for X receivers, Y pieces"), then each parcel by destination with what the
 * receiver still has to pay.
 */
export function CargoListPrint() {
  const { id } = useParams();
  const l = useLoad(() => adminApi.cargoList(id), [id]);
  const x = l.data;
  const { width, chooser } = usePaper(x ? `Cargo list ${x.listNo}` : "Cargo list");

  if (l.err) return <div className="p-6"><ErrorNote err={l.err} onRetry={l.reload} /></div>;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const row = (label, value, bold) => (
    <div className="flex justify-between gap-2"><span>{label}</span><span className={`text-right ${bold ? "font-bold" : ""}`}>{value}</span></div>
  );
  const groups = [];
  for (const p of x.parcels) {
    const g = groups.find((y) => y.city === p.toCity) ?? (groups.push({ city: p.toCity, terminal: p.toTerminal, parcels: [] }), groups.at(-1));
    g.parcels.push(p);
  }

  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        {chooser}
        <Btn kind="primary" onClick={() => window.print()} disabled={x.status === "void"}>Print list</Btn>
        <Link to={`/admin/cargo-lists?q=${x.listNo}`} className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      {x.status === "open" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-amber-500 bg-amber-50 p-2 text-center text-sm text-amber-900">
          Still loading: the list closes when the voucher is generated. Print it again after that for the conductor.
        </p>
      )}
      {x.status === "void" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-red-400 bg-red-50 p-2 text-center text-sm text-red-900">This list is VOID ({x.voidReason}).</p>
      )}
      <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={paperStyle(width)}>
        <div className="text-center">
          <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
          <div className="text-[1.15em] font-bold">Cargo List</div>
          <div className="mt-1 text-[1.6em] font-extrabold tracking-wide">{x.listNo}</div>
          {x.status === "open" && <div className="font-bold">*** NOT CLOSED YET ***</div>}
          {x.status === "void" && <div className="font-bold">*** VOID ***</div>}
        </div>
        {dash}
        {row("Bus", x.bus, true)}
        <div>Route: {x.routeName}</div>
        {row("From", x.cityName ?? "–")}
        {row("Leaves", stamp(x.leavesAt))}
        {row("Voucher", x.voucherNo ?? "not generated")}
        {dash}
        {row("Parcels", `${x.parcelCount} for ${x.receiverCount} receiver${x.receiverCount === 1 ? "" : "s"}`, true)}
        {row("Pieces", `${x.pieces} · ${kg(x.weightKg)}`)}
        {row("Paid (in voucher)", `Rs ${money(x.paidTotal)}`)}
        {row("To collect at dest.", `Rs ${money(x.toPayTotal)}`, true)}
        {groups.map((g) => (
          <div key={g.city}>
            {dash}
            <div className="font-bold">TO {g.city.toUpperCase()} · {g.terminal} ({g.parcels.length})</div>
            {g.parcels.map((p) => (
              <div key={p.id} className="mt-1">
                <div className="flex justify-between gap-2"><b>{p.parcelNo}</b><span>{p.pieces} pc · {kg(p.weightKg)}</span></div>
                <div>{p.receiverName} · {phoneText(p.receiverPhone)}</div>
                <div className="text-right">{p.payment === "paid" || p.paidAt ? "Paid" : <b>TO PAY Rs {money(p.charge)}</b>}</div>
              </div>
            ))}
          </div>
        ))}
        {x.parcels.length === 0 && <div>No parcels.</div>}
        {dash}
        {x.closedByName && row("Closed by", x.closedByName)}
        <div className="mt-3">Counter sig: ______________</div>
        <div className="mt-3">Conductor sig: ______________</div>
        {x.qrSvg && (
          <div className="mt-2 text-center">
            <div className="mx-auto" style={{ width: width === 58 ? "26mm" : "30mm" }} dangerouslySetInnerHTML={{ __html: x.qrSvg }} />
            <div className="mt-1">{x.listNo}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ParcelReceipt  /admin/parcel-receipt/:id   delivery receipt: who collected the parcel, their CNIC (partly hidden),
 * how (receiver's own CNIC / slip), the money taken if the receiver paid, when and by whom. Signed by the collector.
 */
export function ParcelReceipt() {
  const { id } = useParams();
  const state = useLocation().state;
  const p = useLoad(() => adminApi.cargoSlip(id), [id]);
  const x = p.data;
  const { width, chooser } = usePaper(x ? `Receipt ${x.parcelNo}` : "Delivery receipt");

  if (p.err) return <div className="p-6"><ErrorNote err={p.err} onRetry={p.reload} /></div>;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const dash = <div className="my-1 border-t border-dashed border-black" />;
  const row = (label, value, bold) => (
    <div className="flex justify-between gap-2"><span>{label}</span><span className={`text-right ${bold ? "font-bold" : ""}`}>{value}</span></div>
  );
  const paidHere = x.payment === "to_pay" && x.paidAt;

  return (
    <div className="min-h-screen bg-neutral-200 py-4 print:bg-white print:py-0">
      <div className="slip-tools mx-auto mb-3 flex max-w-md flex-wrap items-center justify-center gap-2">
        {chooser}
        <Btn kind="primary" onClick={() => window.print()} disabled={x.status !== "delivered"}>Print receipt</Btn>
        <Link to="/admin/cargo-arrivals" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Arrivals & collection</Link>
      </div>
      {state?.justDelivered && x.status === "delivered" && (
        <p role="status" className="slip-tools mx-auto mb-3 max-w-md rounded-xl border-2 border-green-700 bg-green-50 p-3 text-center text-sm text-green-900">
          <b>{x.parcelNo} handed over to {x.collectedByName}.</b>{" "}
          {state.cashTaken ? <>Rs {money(state.cashTaken)} taken. </> : null}Print the receipt and have the collector sign it.
        </p>
      )}
      {x.status !== "delivered" && (
        <p className="slip-tools mx-auto mb-3 max-w-md rounded-xl border border-amber-500 bg-amber-50 p-2 text-center text-sm text-amber-900">{x.parcelNo} has not been handed over.</p>
      )}
      {x.status === "delivered" && (
        <div className="mx-auto bg-white p-2 font-mono text-black print:p-0" style={paperStyle(width)}>
          <div className="text-center">
            <div className="font-bold">NEW KHAN ROAD RUNNERS</div>
            <div className="text-[1.15em] font-bold">Cargo Delivery Receipt</div>
            <div className="mt-1 text-[1.5em] font-extrabold tracking-wide">{x.parcelNo}</div>
          </div>
          {dash}
          {row("From", `${x.fromCity} · ${x.senderName}`)}
          {row("To", `${x.toCity} · ${x.toTerminal}`)}
          {row("Receiver", x.receiverName)}
          <div>{x.description}</div>
          {row("Pieces", `${x.pieces} · ${kg(x.weightKg)}`)}
          {dash}
          {row("Collected by", x.collectedByName, true)}
          {row("CNIC", maskCnic(x.collectedByCnic))}
          {row("Shown", x.collectedProof === "slip" ? "slip / picture" : "receiver's CNIC")}
          {row("Handed over", stamp(x.deliveredAt))}
          {row("By", x.deliveredByName)}
          {dash}
          {paidHere ? row("Paid now", `Rs ${money(x.charge)}`, true) : row("Charge", "paid at booking")}
          <div className="mt-4">Collector sig: ______________</div>
          <div className="mt-1 text-[0.85em]">I received the parcel in good condition.</div>
        </div>
      )}
    </div>
  );
}
