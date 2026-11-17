/**
 * Bus cargo lists (cargo part 2):
 *   CargoLoadWindow  "Load cargo" for one bus at one terminal (from the Counter screen, the voucher page, or the
 *                    lists page): add parcels by number or by scanning the slip, take them off, see the totals;
 *                    the list closes when the terminal's voucher is generated.
 *   CargoLists       /admin/cargo-lists   find lists (CL number, bus, terminal, status, dates) and open them
 * Printing the list: CargoPrint.jsx (CargoListPrint). The server checks every rule (cargo.lists.js).
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, fmtDT, inFormSave, Input, Label, lastActError, Modal, Page, rs, Select, Table, useLoad } from "../ui";
import { Pager } from "./Operations";
import { PaymentBadge, phoneText } from "./cargoShared";

const kg = (v) => `${Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} kg`;
export const LIST_STATUS = {
  open: ["Loading", "amber"],
  closed: ["Left with the bus", "green"],
  void: ["Void", "red"],
};
export const ListStatus = ({ s }) => <Badge tone={LIST_STATUS[s]?.[1] ?? "grey"}>{LIST_STATUS[s]?.[0] ?? s}</Badge>;

/** "3 parcels for 2 receivers · 6 pieces · 32 kg · Rs 1,200 paid · Rs 480 to pay" */
export function ListTotals({ t }) {
  if (!t) return null;
  const n = t.parcelCount ?? 0;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border-2 border-black bg-neutral-50 p-3 text-sm">
      <span><b className="text-lg">{n}</b> parcel{n === 1 ? "" : "s"} for <b>{t.receiverCount ?? 0}</b> receiver{t.receiverCount === 1 ? "" : "s"}</span>
      <span><b>{t.pieces ?? 0}</b> pieces · {kg(t.weightKg)}</span>
      <span>Paid <b>{rs(t.paidTotal ?? 0)}</b> <span className="text-mute">(on the voucher as Cargo)</span></span>
      <span>To pay at destination <b>{rs(t.toPayTotal ?? 0)}</b></span>
    </div>
  );
}

export function CargoLoadWindow({ tripId, stopId, onClose, onChanged }) {
  const view = useLoad(() => adminApi.cargoLoading(tripId, stopId), [tripId, stopId]);
  const [no, setNo] = useState("");
  const [msg, setMsg] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const v = view.data;

  useEffect(() => {
    if (v?.canEdit) input.current?.focus();
  }, [v?.canEdit]);

  const changed = (data, text) => {
    view.setData(data);
    setMsg(text);
    onChanged?.();
  };
  async function add(parcel) {
    if (!String(parcel).trim()) return setMsg({ ok: false, text: "Type or scan a parcel number." });
    setBusy(true);
    let res;
    const ok = await inFormSave(() => act(async () => { res = await adminApi.cargoListAdd(tripId, stopId, parcel); }));
    setBusy(false);
    if (ok) {
      changed(res.data, { ok: true, text: `${res.added} added.` });
      setNo("");
    } else setMsg({ ok: false, text: lastActError()?.message || "Not added." });
    input.current?.focus();
  }
  async function remove(p) {
    setBusy(true);
    let data;
    const ok = await inFormSave(() => act(async () => { data = await adminApi.cargoListRemove(tripId, stopId, p.id); }));
    setBusy(false);
    if (ok) changed(data, { ok: true, text: `${p.parcelNo} taken off. It waits at the terminal again.` });
    else setMsg({ ok: false, text: lastActError()?.message || "Not removed." });
  }

  const cols = (action) => [
    { key: "parcelNo", label: "Parcel", render: (p) => <span className="font-mono font-bold">{p.parcelNo}</span> },
    { key: "to", label: "To", render: (p) => <b>{p.toCity}</b> },
    { key: "receiver", label: "Receiver", render: (p) => <>{p.receiverName}<br /><span className="text-xs text-mute">{phoneText(p.receiverPhone)}</span></> },
    { key: "size", label: "Pieces · kg", render: (p) => `${p.pieces} · ${kg(p.weightKg)}` },
    { key: "charge", label: "Charge", render: (p) => <>{rs(p.charge)} <PaymentBadge p={p} /></> },
    ...(action ? [{ key: "a", label: "", render: action }] : []),
  ];

  return (
    <Modal wide title={v ? `Cargo · bus ${v.trip.busNo} · ${v.stop.city}` : "Cargo"} onClose={onClose}>
      <ErrorNote err={view.err} onRetry={view.reload} />
      {!v ? <p className="text-sm text-mute">Loading…</p> : (
        // minmax(0, 1fr): the wide tables scroll inside their own box instead of widening the window on a phone.
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>{v.trip.routeName} · leaves {v.stop.city} <b>{fmtDT(v.stop.time)}</b></span>
            {v.list ? <><Badge tone="blue">List {v.list.listNo}</Badge> <ListStatus s={v.list.status} /></> : <Badge>No list yet</Badge>}
            {v.voucher && <Badge tone="green">Voucher {v.voucher.voucherNo}</Badge>}
          </div>
          {v.list?.status === "closed" && (
            <p className="rounded-xl border-2 border-green-700 bg-green-50 p-3 text-sm text-green-900">
              The {v.stop.city} voucher is generated: this list is closed and its parcels are on the bus. Cargo on the voucher: <b>{rs(v.list.paidTotal)}</b>.
            </p>
          )}
          {!v.list && v.voucher && <p className="rounded-xl border border-neutral-300 p-3 text-sm">The {v.stop.city} voucher is generated without cargo for this bus.</p>}
          {!v.canEdit && !v.voucher && v.list?.status !== "closed" && (
            <p className="rounded-xl border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
              {v.canLoadHere ? `This trip is ${v.trip.status}: no cargo can be loaded.` : `Only ${v.stop.city} counter staff (or a manager) can load cargo here.`}
            </p>
          )}

          {v.canEdit && (
            <form onSubmit={(e) => { e.preventDefault(); add(no); }} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[14rem] flex-1">
                <Label htmlFor="cl-no">Parcel number (type or scan the slip / label)</Label>
                {/* A plain input: the shared Input does not pass a ref, and the box is focused again after each scan. */}
                <input id="cl-no" ref={input} value={no} onChange={(e) => setNo(e.target.value)} placeholder="CG-0000123" autoComplete="off"
                  className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black" />
              </div>
              <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Adding…" : "Add to list"}</Btn>
            </form>
          )}
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "text-green-800" : "text-red-700"}`}>{msg.text}</p>
          )}

          {v.list && <ListTotals t={v.list} />}
          <div>
            <h3 className="mb-2 font-bold">On this bus's list {v.list ? `(${v.parcels.length})` : ""}</h3>
            <Table
              rows={v.parcels}
              empty={v.canEdit ? "No parcels yet. Add them above, or from the parcels waiting below." : "No parcels."}
              cols={cols(v.canEdit ? (p) => <Btn small kind="danger" disabled={busy} onClick={() => remove(p)}>Take off</Btn> : null)}
            />
          </div>

          {v.canEdit && (
            <div>
              <h3 className="mb-1 font-bold">Waiting at {v.stop.city} for this bus ({v.waiting.length})</h3>
              <p className="mb-2 text-xs text-mute">Parcels booked here going to {v.destinations.map((d) => d.city).join(", ")}.</p>
              <Table
                rows={v.waiting}
                empty="Nothing waiting for this bus's stops."
                cols={cols((p) => <Btn small disabled={busy} onClick={() => add(p.parcelNo)}>Add</Btn>)}
              />
              {v.otherWaiting > 0 && <p className="mt-2 text-xs text-mute">{v.otherWaiting} other parcel{v.otherWaiting === 1 ? " is" : "s are"} waiting here for places this bus does not go to.</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {v.list && v.parcels.length > 0 && (
              <a className="btn btn-gold !min-h-10 !px-4 !py-1 text-sm" href={`/admin/cargo-list/${v.list.id}`} target="_blank" rel="noreferrer">Print list</a>
            )}
            <Btn onClick={onClose}>Close</Btn>
          </div>
          {v.canEdit && v.parcels.length > 0 && (
            <p className="text-xs text-mute">When the {v.stop.city} voucher is generated, this list closes and its paid total ({rs(v.list.paidTotal)}) becomes the voucher's Cargo.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CargoLists() {
  const [sp, setSp] = useSearchParams();
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [applied, setApplied] = useState(urlQ);
  const [status, setStatus] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // { tripId, stopId }
  const setup = useLoad(() => adminApi.cargoSetup(), []);
  const list = useLoad(() => adminApi.cargoLists({ q: applied || undefined, status, terminalId, from, to, page, limit: 25 }), [applied, status, terminalId, from, to, page]);
  const rows = list.data?.data;

  useEffect(() => {
    if (urlQ !== applied) {
      setQ(urlQ);
      setApplied(urlQ);
      setPage(1);
    }
  }, [urlQ]); // eslint-disable-line react-hooks/exhaustive-deps
  // A list number (typed, or the printed list's QR) that finds exactly one list opens it.
  useEffect(() => {
    if (rows?.length === 1 && rows[0].status !== "void" && /CL-?\d/i.test(applied) && page === 1) setOpen({ tripId: rows[0].tripId, stopId: rows[0].boardingStopId });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(q.trim());
    setSp(q.trim() ? { q: q.trim() } : {}, { replace: true });
  };

  return (
    <Page title="Cargo lists" intro="The parcels each bus carries from a terminal. Find a list by its number (or scan the printed list), the bus number or the route.">
      <form onSubmit={search} className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <Label htmlFor="cl-q">Search</Label>
          <Input id="cl-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="CL-000012, bus number or route" />
        </div>
        <Btn kind="primary" type="submit">Search</Btn>
        {applied && <Btn onClick={() => { setQ(""); setApplied(""); setSp({}, { replace: true }); }}>Clear</Btn>}
      </form>
      <Filters>
        <div>
          <Label htmlFor="cl-s">Status</Label>
          <Select id="cl-s" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: "", label: "All" }, ...Object.entries(LIST_STATUS).map(([k, [l]]) => ({ value: k, label: l }))]} />
        </div>
        <div>
          <Label htmlFor="cl-t">Terminal</Label>
          <Select id="cl-t" value={terminalId} onChange={(e) => { setTerminalId(e.target.value); setPage(1); }}
            options={[{ value: "", label: "All" }, ...(setup.data?.terminals ?? []).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))]} />
        </div>
        <div>
          <Label htmlFor="cl-from">Leaving from</Label>
          <Input id="cl-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <Label htmlFor="cl-to">to</Label>
          <Input id="cl-to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <Btn onClick={list.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={rows}
        empty={applied ? `No cargo list found for "${applied}".` : "No cargo lists yet. Load cargo on a bus from the Counter screen."}
        cols={[
          {
            key: "listNo",
            label: "List",
            render: (r) =>
              r.status === "void" ? (
                <span className="font-mono font-bold text-mute line-through">{r.listNo}</span>
              ) : (
                <button type="button" className="font-mono font-bold underline" onClick={() => setOpen({ tripId: r.tripId, stopId: r.boardingStopId })}>{r.listNo}</button>
              ),
          },
          { key: "bus", label: "Bus", render: (r) => <b>{r.bus}</b> },
          { key: "route", label: "Route · from", render: (r) => <>{r.routeName}<br /><span className="text-xs text-mute">from {r.cityName ?? "–"}</span></> },
          { key: "leaves", label: "Leaves", render: (r) => fmtDT(r.leavesAt) },
          { key: "n", label: "Parcels", render: (r) => <>{r.parcelCount ?? 0} <span className="text-xs text-mute">({r.pieces ?? 0} pcs)</span></> },
          { key: "paid", label: "Paid", render: (r) => rs(r.paidTotal ?? 0) },
          { key: "topay", label: "To pay", render: (r) => rs(r.toPayTotal ?? 0) },
          { key: "status", label: "Status", render: (r) => <><ListStatus s={r.status} />{r.voucherNo && <div className="mt-1 text-xs text-mute">voucher {r.voucherNo}</div>}{r.voidReason && <div className="mt-1 text-xs text-mute">{r.voidReason}</div>}</> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={setPage} />
      {open && <CargoLoadWindow tripId={open.tripId} stopId={open.stopId} onClose={() => setOpen(null)} onChanged={list.reload} />}
    </Page>
  );
}
