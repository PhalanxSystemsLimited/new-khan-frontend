/**
 * Admin > Activity log: who changed what, newest first.
 * Each entry opens a readable "Details" window: when, who (name, role, email), what was done in plain words, the
 * item (with a link where the admin panel has a page for it), the fields that changed (before / after), the IP
 * address, and the raw stored data for checking. The window's address is kept in ?log=<id>, so it can be linked.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../api";
import { Btn, ErrorNote, Filters, fmtD, fmtDT, Input, Label, Modal, Page, rs, Select, Table, useLoad } from "../ui";

const PAGE_SIZE = 30;

const ROLE_NAME = {
  customer: "Customer", agent: "Counter staff", driver: "Driver", conductor: "Conductor", manager: "Manager", admin: "Admin", super_admin: "Super admin",
};

/** Every action the backend logs, in plain words. Anything new falls back to a readable version of its code. */
const ACTION_NAME = {
  "booking.cancel": "Cancelled a booking",
  "booking.counter_cancel": "Cancelled and refunded a booking at the counter",
  "booking.counter_code": "Sent a refund code by SMS",
  "booking.counter_identity_failed": "Counter refund: the customer's CNIC or code did not match",
  "cancellation_policy.replace": "Changed the refund rules",
  "conductor.create": "Added a conductor",
  "conductor.update": "Changed a conductor",
  "conductor.no_show": "Conductor marked a passenger as not travelled",
  "conductor.road_passenger": "Conductor booked a road passenger",
  "content.update": "Changed website content",
  "content.reset": "Reset website content to the default",
  "day_plan.publish": "Published a day plan",
  "employee.create": "Added an employee",
  "employee.update": "Changed an employee",
  "employee.login": "Created or changed an employee's login",
  "fare.create": "Added a fare",
  "fare.update": "Changed a fare",
  "offroute_category.create": "Added an off-route expense type",
  "offroute_category.update": "Changed an off-route expense type",
  "offroute_category.reorder": "Re-ordered off-route expense types",
  "offroute_default.set": "Set a default off-route expense",
  "offroute_default.remove": "Removed a default off-route expense",
  "payment.cash": "Took a cash payment",
  "promo.create": "Added a promo code",
  "refund.update": "Decided a refund",
  "report_token.regenerate": "Made a new QR link for a trip report",
  "round_trip.create": "Created a round trip report",
  "round_trip.create_from_trips": "Created a round trip report from trips",
  "round_trip.update": "Changed a round trip report",
  "round_trip.delete": "Deleted a round trip report",
  "round_trip.finalize": "Finalised a round trip report",
  "round_trip.fuel": "Entered fuel on a round trip report",
  "round_trip.apply_defaults": "Applied default expenses to a round trip report",
  "round_trip.auto_scan": "Automatic check for new round trip reports",
  "round_trip.sync_vouchers": "Updated a round trip report from its vouchers",
  "round_trip.leg_add": "Added a leg to a round trip report",
  "round_trip.leg_update": "Changed a leg of a round trip report",
  "round_trip.leg_delete": "Removed a leg from a round trip report",
  "round_trip.offroute_add": "Added an off-route expense",
  "round_trip.offroute_override": "Changed an off-route expense",
  "round_trip.offroute_remove": "Removed an off-route expense",
  "route.create": "Added a route",
  "route.stops_replace": "Changed a route's stops",
  "schedule.generate_trips": "Made trips from a schedule",
  "staff_member.create": "Added a staff member",
  "staff_member.update": "Changed a staff member",
  "terminal_deduction.set": "Set a terminal deduction",
  "ticket.board": "Marked a passenger as boarded",
  "trip.create": "Added a trip",
  "trip.status": "Changed a trip's status",
  "trip.assignment": "Changed a trip's bus or crew",
  "trip_voucher.generate": "Generated a trip voucher",
  "trip_voucher.replace": "Replaced a trip voucher",
  "user.role_change": "Changed a user's role",
  "user.status_change": "Turned a user's account on or off",
  "voucher.create": "Created a terminal voucher",
  "voucher.update": "Changed a terminal voucher",
  "voucher.delete": "Deleted a terminal voucher",
};

const words = (s) =>
  String(s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.]+/g, " ")
    .trim()
    .toLowerCase();

/** "employee_list.create" -> "Added an employee list" style fallback for actions not in the list above. */
function actionName(a) {
  if (ACTION_NAME[a]) return ACTION_NAME[a];
  const [thing, verb = ""] = String(a).split(/\.(?=[^.]+$)/);
  const t = words(thing);
  if (verb === "create") return `Added: ${t}`;
  if (verb === "update") return `Changed: ${t}`;
  if (verb === "delete" || verb === "remove") return `Removed: ${t}`;
  return `${t[0]?.toUpperCase() ?? ""}${t.slice(1)}${verb ? `: ${words(verb)}` : ""}`;
}

const typeName = (t) => {
  const w = words(t);
  return w ? w[0].toUpperCase() + w.slice(1) : "";
};

/** Field names in words: "departureAt" / "departure_at" -> "Departure at"; a few short forms kept upper-case. */
const UPPER = { id: "ID", pnr: "PNR", cnic: "CNIC", ip: "IP", sms: "SMS", qr: "QR", ac: "AC", url: "URL", pkr: "PKR" };
function fieldName(path) {
  return path
    .split(".")
    .map((part) =>
      /^\d+$/.test(part)
        ? `#${Number(part) + 1}`
        : words(part)
            .split(" ")
            .map((w) => UPPER[w] ?? w)
            .join(" ")
            .replace(/^./, (c) => c.toUpperCase()),
    )
    .join(" › ");
}

const MONEY_KEY = /(amount|fare|fee|price|total|subtotal|cash|discount|balance|deduction|cost|rate|salary|wage|allowance|advance)$/i;
const ISO_DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_D = /^\d{4}-\d{2}-\d{2}$/;

/** One value, readable: Yes/No, Rs amounts, Pakistan dates and times, lists. */
function showValue(v, key = "") {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return MONEY_KEY.test(key) ? rs(v) : v.toLocaleString("en-US");
  if (typeof v === "string") {
    if (ISO_DT.test(v) && !Number.isNaN(Date.parse(v))) return fmtDT(v);
    if (ISO_D.test(v)) return fmtD(`${v}T12:00:00+05:00`);
    if (MONEY_KEY.test(key) && /^-?\d+(\.\d+)?$/.test(v)) return rs(v);
    return v;
  }
  if (Array.isArray(v) && v.every((x) => x === null || typeof x !== "object")) return v.length ? v.map((x) => showValue(x)).join(", ") : "—";
  const json = JSON.stringify(v);
  return json.length > 300 ? `${json.slice(0, 300)}…` : json;
}

/** { a: { b: 1 } } -> { "a.b": 1 }, two levels deep; deeper parts and lists of objects stay whole. */
function flatten(obj, prefix = "", depth = 0, out = {}) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  const keys = Object.keys(obj);
  if (!keys.length && prefix) out[prefix] = obj;
  for (const k of keys) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v) && depth < 2) flatten(v, path, depth + 1, out);
    else out[path] = v;
  }
  return out;
}

/** The stored data may be an object, or (older entries) a plain value. */
const asObject = (d) => (d === null || d === undefined ? null : typeof d === "object" && !Array.isArray(d) ? d : { value: d });
const lastKey = (path) => path.split(".").pop();

/** The admin panel page for an item, when there is one (only for items that still exist). */
function itemLink(r) {
  if (!r.entityLabel) return null;
  if (r.entityType === "round_trip" && /^\d+$/.test(r.entityId)) return `/admin/round-trips/${r.entityId}`;
  if (r.entityType === "trip_voucher") return `/admin/trip-vouchers/${r.entityId}`;
  return null;
}

const itemText = (r) => r.entityLabel ?? `${typeName(r.entityType)} · ${String(r.entityId).length > 14 ? `${String(r.entityId).slice(0, 12)}…` : r.entityId}`;

function Who({ r, full = false }) {
  if (!r.actorId) return <span className="text-neutral-600">System (automatic)</span>;
  return (
    <span>
      <span className="font-semibold">{r.actorName ?? r.actorEmail ?? "Unknown user"}</span>
      {r.actorRole && <span className="ms-1.5 inline-block whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">{ROLE_NAME[r.actorRole] ?? r.actorRole}</span>}
      {full && r.actorEmail && <span className="block text-xs text-neutral-600">{r.actorEmail}</span>}
    </span>
  );
}

/** Field | Before | After for the fields that changed; or the saved values for a create / delete. */
function Changes({ r }) {
  const [showSame, setShowSame] = useState(false);
  const before = asObject(r.oldData);
  const after = asObject(r.newData);
  const fb = flatten(before ?? {});
  const fa = flatten(after ?? {});

  if (!before && !after) return <p className="text-sm text-neutral-600">No extra details were saved for this action.</p>;

  if (before && after) {
    // A group that was empty on one side and has fields on the other (e.g. terminal: null -> { id, name }) is shown
    // by its fields only, not as an extra empty row.
    const all = [...new Set([...Object.keys(fb), ...Object.keys(fa)])];
    const keys = all.filter((k) => !all.some((o) => o.startsWith(`${k}.`)));
    const same1 = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const changed = keys.filter((k) => !same1(fb[k], fa[k]));
    const same = keys.filter((k) => !changed.includes(k));
    const rows = showSame ? [...changed, ...same] : changed;
    return (
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-600">What changed</h3>
        {changed.length === 0 && <p className="mb-2 text-sm text-neutral-600">Nothing changed in the saved fields.</p>}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-neutral-300">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600">
                <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">Before</th><th className="px-3 py-2">After</th></tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const diff = changed.includes(k);
                  return (
                    <tr key={k} className="border-t border-neutral-200 align-top">
                      <td className="px-3 py-2 font-semibold">{fieldName(k)}</td>
                      <td className={`px-3 py-2 break-words ${diff ? "bg-red-50 text-red-900 line-through decoration-red-300" : ""}`}>{showValue(fb[k], lastKey(k))}</td>
                      <td className={`px-3 py-2 break-words ${diff ? "bg-green-50 font-semibold text-green-900" : ""}`}>{showValue(fa[k], lastKey(k))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {same.length > 0 && (
          <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setShowSame((s) => !s)}>
            {showSame ? "Hide unchanged fields" : `Show ${same.length} unchanged field${same.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    );
  }

  const data = after ? fa : fb;
  const keys = Object.keys(data);
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-600">{after ? "Saved details" : "Details before it was removed"}</h3>
      <div className="overflow-x-auto rounded-xl border border-neutral-300">
        <table className="w-full text-sm">
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="border-t border-neutral-200 align-top first:border-0">
                <td className="w-2/5 px-3 py-2 font-semibold">{fieldName(k)}</td>
                <td className="px-3 py-2 break-words">{showValue(data[k], lastKey(k))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailsModal({ r, onClose }) {
  const link = itemLink(r);
  const when = r.createdAt
    ? new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "–";
  return (
    <Modal title="Activity details" onClose={onClose} wide>
      <div className="grid gap-5">
        <p className="text-lg font-bold text-black">{actionName(r.action)}</p>
        <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-neutral-100 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase text-neutral-500">When</dt><dd>{when} <span className="text-neutral-500">(Pakistan time)</span></dd></div>
          <div><dt className="text-xs font-bold uppercase text-neutral-500">Who</dt><dd><Who r={r} full /></dd></div>
          <div>
            <dt className="text-xs font-bold uppercase text-neutral-500">Item</dt>
            <dd>
              {link ? <Link to={link} className="font-semibold underline">{itemText(r)}</Link> : <span className="font-semibold">{itemText(r)}</span>}
              <span className="block text-xs text-neutral-600">{typeName(r.entityType)} · <span className="font-mono">{r.entityId}</span></span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-neutral-500">Action code</dt>
            <dd><span className="font-mono text-xs">{r.action}</span></dd>
          </div>
          <div><dt className="text-xs font-bold uppercase text-neutral-500">From IP address</dt><dd className="font-mono text-xs">{r.ipAddress ?? "—"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-neutral-500">Log entry</dt><dd className="font-mono text-xs">#{r.id}</dd></div>
        </dl>
        <Changes r={r} />
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold underline">Show raw data</summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-neutral-300 bg-white p-3 text-xs">
            {JSON.stringify({ before: r.oldData ?? null, after: r.newData ?? null }, null, 2)}
          </pre>
        </details>
        <div><Btn onClick={onClose}>Close</Btn></div>
      </div>
    </Modal>
  );
}

const EMPTY = { entityType: "", actorId: "", from: "", to: "", q: "" };

export function Activity() {
  const [sp, setSp] = useSearchParams();
  const [f, setF] = useState(EMPTY); // what is being typed
  const [applied, setApplied] = useState(EMPTY); // what the list shows
  const [page, setPage] = useState(1);
  const meta = useLoad(() => adminApi.auditLogMeta(), []);
  const list = useLoad(
    () =>
      adminApi.auditLogs({
        entityType: applied.entityType || undefined,
        actorId: applied.actorId || undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        q: applied.q.trim() || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [applied, page],
  );
  const rows = list.data?.data;

  // The open entry lives in ?log=<id>: from the list when it is there, otherwise loaded on its own (a shared link).
  const openId = sp.get("log");
  const fromList = useMemo(() => rows?.find((r) => String(r.id) === openId) ?? null, [rows, openId]);
  const [single, setSingle] = useState({ id: null, row: null, err: "" });
  useEffect(() => {
    if (!openId || fromList || !/^\d+$/.test(openId)) return undefined;
    let live = true; // ignore the answer if another entry was opened (or the list brought this one) meanwhile
    setSingle({ id: openId, row: null, err: "" });
    adminApi.auditLog(openId).then(
      (row) => live && setSingle({ id: openId, row, err: "" }),
      (e) => live && setSingle({ id: openId, row: null, err: e.message }),
    );
    return () => {
      live = false;
    };
  }, [openId, fromList]);
  const open = fromList ?? (single.id === openId ? single.row : null);

  const setOpen = (id) => {
    const next = new URLSearchParams(sp);
    if (id) next.set("log", String(id));
    else next.delete("log");
    setSp(next, { replace: true });
  };

  const search = (e) => {
    e?.preventDefault();
    if (f.from && f.to && f.from > f.to) return;
    setApplied({ ...f, q: f.q.trim() });
    setPage(1);
  };
  const clear = () => {
    setF(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };
  const filtered = Object.values(applied).some(Boolean);
  const types = meta.data?.types ?? [];
  const actors = meta.data?.actors ?? [];
  const badRange = f.from && f.to && f.from > f.to;

  return (
    <Page title="Activity log" intro="Who changed what in the admin tools, newest first. Press Details to see exactly what changed.">
      <form onSubmit={search}>
        <Filters>
          <div>
            <Label htmlFor="a-e">Type</Label>
            <Select id="a-e" value={f.entityType} onChange={(e) => setF({ ...f, entityType: e.target.value })} options={[{ value: "", label: "All" }, ...types.map((t) => ({ value: t, label: typeName(t) }))]} />
          </div>
          <div>
            <Label htmlFor="a-p">Person</Label>
            <Select id="a-p" value={f.actorId} onChange={(e) => setF({ ...f, actorId: e.target.value })} options={[{ value: "", label: "Everyone" }, ...actors.map((a) => ({ value: a.id, label: `${a.name}${a.role ? ` (${ROLE_NAME[a.role] ?? a.role})` : ""}` }))]} />
          </div>
          <div>
            <Label htmlFor="a-f">From</Label>
            <Input id="a-f" type="date" value={f.from} max={f.to || undefined} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="a-t">To</Label>
            <Input id="a-t" type="date" value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="a-q">Search</Label>
            <Input id="a-q" value={f.q} maxLength={80} placeholder="PNR, voucher no., name, any text" onChange={(e) => setF({ ...f, q: e.target.value })} />
          </div>
          <Btn kind="primary" type="submit" disabled={!!badRange}>Search</Btn>
          {filtered && <Btn type="button" onClick={clear}>Clear filters</Btn>}
          <Btn type="button" onClick={list.reload}>Refresh</Btn>
        </Filters>
        {badRange && <p role="alert" className="-mt-2 mb-3 text-sm font-semibold text-red-700">The "From" date is after the "To" date.</p>}
      </form>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={rows}
        empty={filtered ? "Nothing matches these filters." : "Nothing has been logged yet."}
        cols={[
          { key: "createdAt", label: "When", render: (r) => <span className="whitespace-nowrap">{fmtDT(r.createdAt)}</span> },
          { key: "actorName", label: "Who", render: (r) => <Who r={r} /> },
          {
            key: "action",
            label: "Action",
            render: (r) => (
              <span>
                {actionName(r.action)}
                <span className="block font-mono text-[11px] text-neutral-500">{r.action}</span>
              </span>
            ),
          },
          { key: "e", label: "Item", render: (r) => <span className="text-sm">{itemText(r)}</span> },
          { key: "a", label: "", render: (r) => <Btn small onClick={() => setOpen(r.id)}>Details</Btn> },
        ]}
      />
      <div className="mt-3 flex items-center gap-2 text-sm">
        <Btn small disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Newer</Btn>
        <span>Page {page}</span>
        <Btn small disabled={(rows?.length ?? 0) < PAGE_SIZE} onClick={() => setPage(page + 1)}>Older ›</Btn>
      </div>

      {open && <DetailsModal r={open} onClose={() => setOpen(null)} />}
      {openId && !open && single.err && (
        <Modal title="Activity details" onClose={() => setOpen(null)}>
          <p className="text-sm">{single.err}</p>
        </Modal>
      )}
    </Page>
  );
}
