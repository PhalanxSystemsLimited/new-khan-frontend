/** People and reports: user accounts and staff roles, revenue reports, activity (audit) log. */
import { useState } from "react";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, fmtD, fmtDT, Input, Label, Page, pkDate, rs, Section, Select, StatusBadge, Table, useConfirm, useForm, useLoad } from "../ui";
import { Pager } from "./Operations";

const ROLES = [
  { value: "customer", label: "Customer" },
  { value: "agent", label: "Agent (counter / boarding staff)" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

/* ------------------------------------------------------------------ users */

export function Users({ me }) {
  const [q, setQ] = useState({ search: "", role: "" });
  const [applied, setApplied] = useState({ page: 1 });
  const list = useLoad(() => adminApi.users({ ...applied, limit: 25 }), [JSON.stringify(applied)]);
  const [openForm, form] = useForm();
  const [ask, confirmNode] = useConfirm();
  const superAdmin = me.role === "super_admin";

  const role = (u) =>
    openForm({
      title: `Role · ${u.fullName || u.email || u.phone}`,
      note: superAdmin
        ? "Agents can run trips, boarding and bookings. Admins can change everything except other admins. Super admins can manage admins."
        : "Only a super admin can make someone an admin or change an admin's role.",
      fields: [{ name: "role", label: "Role", type: "select", required: true, options: superAdmin ? ROLES : ROLES.slice(0, 2) }],
      initial: { role: u.role },
      onSubmit: (b) => act(() => adminApi.setRole(u.id, b.role), "Role changed").then((ok) => (ok && list.reload(), ok)),
    });

  async function toggle(u) {
    const off = u.isActive;
    if (off && !(await ask(`Block ${u.fullName || u.email}?`, "They won't be able to sign in or book until unblocked."))) return;
    if (await act(() => adminApi.setActive(u.id, !off), off ? "Account blocked" : "Account unblocked")) list.reload();
  }

  return (
    <Page
      title="Users & staff"
      intro="Every account. To add a staff member: they sign up on the website first, then you find them here and change their role."
    >
      <form onSubmit={(e) => { e.preventDefault(); setApplied({ search: q.search.trim() || undefined, role: q.role || undefined, page: 1 }); }}>
        <Filters>
          <div>
            <Label htmlFor="u-s">Name, email or phone</Label>
            <Input id="u-s" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="u-r">Role</Label>
            <Select id="u-r" value={q.role} onChange={(e) => setQ({ ...q, role: e.target.value })} options={[{ value: "", label: "All" }, ...ROLES]} />
          </div>
          <Btn kind="primary" type="submit">Search</Btn>
        </Filters>
      </form>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        cols={[
          { key: "fullName", label: "Name", render: (r) => <b>{r.fullName || "–"}</b> },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "role", label: "Role", render: (r) => <Badge tone={r.role === "customer" ? "grey" : "blue"}>{r.role.replace("_", " ")}</Badge> },
          { key: "lastLoginAt", label: "Last sign-in", render: (r) => fmtDT(r.lastLoginAt) },
          { key: "createdAt", label: "Joined", render: (r) => fmtD(r.createdAt) },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (r) =>
              r.id === me.id ? (
                <span className="text-xs text-mute">You</span>
              ) : (
                <div className="flex gap-1">
                  <Btn small onClick={() => role(r)}>Role</Btn>
                  <Btn small kind={r.isActive ? "danger" : "ok"} onClick={() => toggle(r)}>{r.isActive ? "Block" : "Unblock"}</Btn>
                </div>
              ),
          },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={(page) => setApplied({ ...applied, page })} />
      {form}
      {confirmNode}
    </Page>
  );
}

/* ------------------------------------------------------------------ reports */

export function Reports() {
  const [range, setRange] = useState({ from: pkDate(-29), to: pkDate() });
  const [draft, setDraft] = useState(range);
  const sum = useLoad(() => adminApi.summary(range.from, range.to), [range.from, range.to]);
  const daily = useLoad(() => adminApi.dailyRevenue(range.from, range.to), [range.from, range.to]);
  const cash = useLoad(() => adminApi.cashReport(range.from, range.to), [range.from, range.to]);
  const s = sum.data;

  const byDay = {};
  for (const r of daily.data ?? []) {
    const d = String(r.day).slice(0, 10);
    byDay[d] ??= { day: d, total: 0, payments: 0, methods: {} };
    byDay[d].total += Number(r.grossAmount);
    byDay[d].payments += Number(r.payments);
    byDay[d].methods[r.method] = (byDay[d].methods[r.method] ?? 0) + Number(r.grossAmount);
  }
  const days = Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day));
  const preset = (n) => {
    const r = { from: pkDate(-(n - 1)), to: pkDate() };
    setDraft(r);
    setRange(r);
  };

  return (
    <Page title="Reports" intro="Money taken and bookings, by day (Pakistan time). Revenue counts payments received; refunds are shown separately.">
      <Filters>
        <div><Label htmlFor="rp-f">From</Label><Input id="rp-f" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></div>
        <div><Label htmlFor="rp-t">To</Label><Input id="rp-t" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></div>
        <Btn kind="primary" onClick={() => setRange(draft)}>Show</Btn>
        <Btn onClick={() => preset(1)}>Today</Btn>
        <Btn onClick={() => preset(7)}>7 days</Btn>
        <Btn onClick={() => preset(30)}>30 days</Btn>
      </Filters>
      <ErrorNote err={sum.err || daily.err} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Revenue", s && rs(s.grossRevenue)],
          ["Refunds paid", s && rs(s.refundsPaid)],
          ["Confirmed bookings", s?.confirmedBookings],
          ["Seats sold", s?.seatsSold],
          ["Cancellations", s?.cancellations],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border-2 border-black bg-white p-4">
            <p className="text-xs font-bold uppercase text-neutral-500">{k}</p>
            <p className="mt-1 text-2xl font-extrabold">{v ?? "…"}</p>
          </div>
        ))}
      </div>
      <Section title="Revenue by day">
        <Table
          loading={daily.loading}
          rows={days}
          rowKey={(r) => r.day}
          empty="No payments in this period."
          cols={[
            { key: "day", label: "Day", render: (r) => fmtD(`${r.day}T12:00:00+05:00`) },
            { key: "payments", label: "Payments" },
            { key: "m", label: "By method", render: (r) => Object.entries(r.methods).map(([m, a]) => `${m}: ${rs(a)}`).join(" · ") },
            { key: "total", label: "Total", render: (r) => <b>{rs(r.total)}</b> },
          ]}
        />
      </Section>
      <Section title="Cash by staff member">
        <p className="mb-3 text-sm text-mute">
          Cash each person took for counter sales and paid out for counter refunds, per day. Net is what they should hand in for that day.
        </p>
        <ErrorNote err={cash.err} onRetry={cash.reload} />
        <Table
          loading={cash.loading}
          rows={cash.data}
          rowKey={(r) => `${r.day}-${r.staffId}`}
          empty="No cash taken or refunded in this period."
          cols={[
            { key: "day", label: "Day", render: (r) => fmtD(`${String(r.day).slice(0, 10)}T12:00:00+05:00`) },
            { key: "staff", label: "Staff", render: (r) => <>{r.staffName ?? "Unknown"}<br /><span className="text-xs text-mute">{r.staffEmail ?? ""}{r.staffRole ? ` · ${r.staffRole.replace("_", " ")}` : ""}</span></> },
            { key: "taken", label: "Cash taken", render: (r) => <>{rs(r.taken)}<br /><span className="text-xs text-mute">{r.sales} sale(s)</span></> },
            { key: "paidOut", label: "Refunded in cash", render: (r) => <>{rs(r.paidOut)}<br /><span className="text-xs text-mute">{r.refunds} refund(s)</span></> },
            { key: "net", label: "Net to hand in", render: (r) => <b className={Number(r.net) < 0 ? "text-red-700" : ""}>{rs(r.net)}</b> },
          ]}
        />
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ activity log */

const ENTITIES = ["", "booking", "payment", "refund", "trip", "fare", "route", "promo_code", "cancellation_policy", "user", "schedule", "site_content"];

export function Activity() {
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const list = useLoad(() => adminApi.auditLogs({ entityType: entityType || undefined, page, limit: 30 }), [entityType, page]);
  const [open, setOpen] = useState(null);
  const rows = list.data?.data;
  return (
    <Page title="Activity log" intro="Who changed what in the admin tools, newest first.">
      <Filters>
        <div>
          <Label htmlFor="a-e">Type</Label>
          <Select id="a-e" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} options={ENTITIES.map((e) => ({ value: e, label: e ? e.replace("_", " ") : "All" }))} />
        </div>
        <Btn onClick={list.reload}>Refresh</Btn>
      </Filters>
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={rows}
        cols={[
          { key: "createdAt", label: "When", render: (r) => fmtDT(r.createdAt) },
          { key: "actorName", label: "Who", render: (r) => r.actorName ?? "System" },
          { key: "action", label: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: "e", label: "Item", render: (r) => <span className="text-xs">{r.entityType} · {String(r.entityId).slice(0, 12)}</span> },
          { key: "a", label: "", render: (r) => (r.newData || r.oldData ? <Btn small onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "Details"}</Btn> : null) },
        ]}
      />
      {open && rows?.find((r) => r.id === open) && (
        <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-neutral-300 bg-white p-3 text-xs">
          {JSON.stringify({ before: rows.find((r) => r.id === open).oldData, after: rows.find((r) => r.id === open).newData }, null, 2)}
        </pre>
      )}
      <div className="mt-3 flex gap-2 text-sm">
        <Btn small disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Newer</Btn>
        <span>Page {page}</span>
        <Btn small disabled={(rows?.length ?? 0) < 30} onClick={() => setPage(page + 1)}>Older ›</Btn>
      </div>
    </Page>
  );
}
