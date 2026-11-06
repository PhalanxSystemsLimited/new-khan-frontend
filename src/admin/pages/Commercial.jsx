/** Sales rules: promo codes and the refund (cancellation) rules. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { act, Btn, ErrorNote, fmtDT, Input, Page, rs, StatusBadge, Table, useForm, useLoad } from "../ui";
import { Pager } from "./Operations";

/** ISO time -> "YYYY-MM-DDTHH:mm" in Pakistan time, for a datetime-local input. */
const toPkLocal = (iso) => (iso ? new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 16) : "");

/* ------------------------------------------------------------------ promo codes */

export function Promos() {
  const [page, setPage] = useState(1);
  const list = useLoad(() => adminApi.promos({ page, limit: 25 }), [page]);
  const routes = useLoad(() => adminApi.routes(), []);
  const [openForm, form] = useForm();

  const add = () =>
    openForm({
      title: "New promo code",
      note: "Customers type the code at checkout. Times are Pakistan time.",
      fields: [
        { name: "code", label: "Code", type: "text", required: true, placeholder: "EID25", hint: "3–30 letters, digits, - or _." },
        { name: "description", label: "Description (staff only)", type: "text" },
        { name: "discountType", label: "Discount type", type: "select", required: true, options: [{ value: "percentage", label: "Percentage (%)" }, { value: "fixed", label: "Fixed amount (Rs)" }] },
        { name: "discountValue", label: "Discount value", type: "number", required: true, min: 0 },
        { name: "maxDiscount", label: "Max discount (Rs)", type: "number", min: 0, hint: "For percentage codes. Blank = no cap." },
        { name: "minBookingAmount", label: "Minimum booking (Rs)", type: "number", min: 0 },
        { name: "usageLimit", label: "Total uses allowed", type: "number", min: 1, hint: "Blank = unlimited." },
        { name: "perUserLimit", label: "Uses per customer", type: "number", min: 1, max: 100 },
        { name: "validFrom", label: "Valid from", type: "datetime", hint: "Blank = now." },
        { name: "validTo", label: "Valid until", type: "datetime", required: true },
        { name: "routeId", label: "Only on route", type: "select", numeric: true, options: (routes.data ?? []).map((r) => ({ value: r.id, label: r.name })), hint: "Blank = every route." },
        { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Code can be used" },
      ],
      initial: { discountType: "percentage", minBookingAmount: 0, perUserLimit: 1, isActive: true },
      submitLabel: "Create code",
      onSubmit: (b) => act(() => adminApi.createPromo({ ...b, code: b.code.toUpperCase() }), "Promo code created").then((ok) => (ok && list.reload(), ok)),
    });

  const edit = (p) =>
    openForm({
      title: `Edit ${p.code}`,
      note: "Code, discount and dates from are fixed once created; make a new code to change them.",
      fields: [
        { name: "description", label: "Description", type: "text" },
        { name: "maxDiscount", label: "Max discount (Rs)", type: "number", min: 0 },
        { name: "usageLimit", label: "Total uses allowed", type: "number", min: 1 },
        { name: "validTo", label: "Valid until", type: "datetime", required: true },
        { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Code can be used" },
      ],
      initial: { description: p.description ?? "", maxDiscount: p.maxDiscount ?? "", usageLimit: p.usageLimit ?? "", validTo: toPkLocal(p.validTo), isActive: p.isActive },
      onSubmit: (b) => act(() => adminApi.updatePromo(p.id, b), "Promo code saved").then((ok) => (ok && list.reload(), ok)),
    });

  const live = (p) => p.isActive && new Date(p.validTo) > new Date() && (!p.usageLimit || p.timesUsed < p.usageLimit);
  return (
    <Page title="Promo codes" actions={<Btn kind="primary" onClick={add}>+ New code</Btn>}>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="No promo codes yet."
        cols={[
          { key: "code", label: "Code", render: (r) => <><span className="font-mono font-bold">{r.code}</span>{r.description && <><br /><span className="text-xs text-mute">{r.description}</span></>}</> },
          { key: "d", label: "Discount", render: (r) => (r.discountType === "percentage" ? `${Number(r.discountValue)}%${r.maxDiscount ? ` (max ${rs(r.maxDiscount)})` : ""}` : rs(r.discountValue)) },
          { key: "min", label: "Min booking", render: (r) => rs(r.minBookingAmount) },
          { key: "u", label: "Used", render: (r) => `${r.timesUsed ?? 0}${r.usageLimit ? ` / ${r.usageLimit}` : ""}` },
          { key: "v", label: "Valid", render: (r) => <span className="text-xs">{fmtDT(r.validFrom)}<br />→ {fmtDT(r.validTo)}</span> },
          { key: "s", label: "Status", render: (r) => <StatusBadge s={live(r) ? "active" : "inactive"} /> },
          { key: "a", label: "", render: (r) => <Btn small onClick={() => edit(r)}>Edit</Btn> },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={setPage} />
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ refund rules */

export function RefundRules() {
  const list = useLoad(() => adminApi.policies(), []);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (list.data) setRows(list.data.map((p) => ({ name: p.name, minHoursBefore: p.minHoursBefore, refundPercent: Number(p.refundPercent) })));
  }, [list.data]);
  const set = (i, k, v) => setRows((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const sorted = [...rows].sort((a, b) => Number(b.minHoursBefore) - Number(a.minHoursBefore));

  async function save() {
    setBusy(true);
    const policies = rows.map((r) => ({ name: r.name.trim(), minHoursBefore: Number(r.minHoursBefore), refundPercent: Number(r.refundPercent) }));
    if (await act(() => adminApi.savePolicies(policies), "Refund rules saved")) list.reload();
    setBusy(false);
  }

  return (
    <Page
      title="Refund rules"
      intro="How much of a paid fare comes back when a confirmed booking is cancelled, by hours left before departure. The rule with the highest 'hours before' that still applies is used. Trips cancelled by New Khan always get a full refund."
    >
      <ErrorNote err={list.err} onRetry={list.reload} />
      <p className="mb-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
        Keep the Refund and cancellation policy text the same as these rules: edit it in <Link to="/admin/content" className="font-bold underline">Website content → Policies</Link>.
      </p>
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="grid items-end gap-2 rounded-xl border border-neutral-300 bg-white p-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
            <div><span className="text-xs font-bold uppercase text-neutral-500">Name</span><Input value={r.name} onChange={(e) => set(i, "name", e.target.value)} /></div>
            <div><span className="text-xs font-bold uppercase text-neutral-500">Hours before ≥</span><Input type="number" min={0} value={r.minHoursBefore} onChange={(e) => set(i, "minHoursBefore", e.target.value)} /></div>
            <div><span className="text-xs font-bold uppercase text-neutral-500">Refund %</span><Input type="number" min={0} max={100} value={r.refundPercent} onChange={(e) => set(i, "refundPercent", e.target.value)} /></div>
            <Btn small kind="danger" disabled={rows.length <= 1} onClick={() => setRows((a) => a.filter((_, j) => j !== i))}>Remove</Btn>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={() => setRows((a) => [...a, { name: "New rule", minHoursBefore: 12, refundPercent: 50 }])}>+ Add rule</Btn>
        <Btn kind="primary" disabled={busy || !rows.length} onClick={save}>{busy ? "Saving…" : "Save rules"}</Btn>
        <Btn onClick={list.reload}>Undo changes</Btn>
      </div>
      <div className="mt-5 rounded-2xl border-2 border-black bg-white p-4 text-sm">
        <p className="font-bold">What customers get with these rules</p>
        <ul className="mt-2 list-disc ps-5">
          {sorted.map((r, i) => {
            const upper = sorted[i - 1]?.minHoursBefore;
            return (
              <li key={i}>
                {upper !== undefined ? `${r.minHoursBefore}–${upper} hours` : `${r.minHoursBefore} hours or more`} before departure: <b>{r.refundPercent}% back</b>, {100 - Number(r.refundPercent)}% kept as a fee
              </li>
            );
          })}
          <li>After departure: nothing back.</li>
        </ul>
        {!rows.some((r) => Number(r.minHoursBefore) === 0) && <p className="mt-2 font-semibold text-red-800">Add a rule with 0 hours (the last hours before departure); saving needs one.</p>}
      </div>
    </Page>
  );
}
