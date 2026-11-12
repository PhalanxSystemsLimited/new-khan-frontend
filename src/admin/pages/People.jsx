/** People and reports: user accounts and staff roles, revenue reports, activity (audit) log. */
import { useState } from "react";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, fmtD, fmtDT, Input, Label, Page, pkDate, rs, Section, Select, StatusBadge, Table, useConfirm, useForm, useLoad } from "../ui";
import { Pager } from "./Operations";

const ROLES = [
  { value: "customer", label: "Customer" },
  { value: "agent", label: "Counter staff (sells tickets, makes vouchers at their terminal)" },
  { value: "driver", label: "Driver (sees their own trips)" },
  { value: "conductor", label: "Conductor (conductor screen for their own trips)" },
  { value: "manager", label: "Manager (operations, crew, replacement vouchers, reports)" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];
/** Roles an admin (not super admin) may give: the rest are for super admins only. */
const ADMIN_GIVES = ["customer", "agent", "driver", "conductor"];
const ROLE_SHORT = { customer: "customer", agent: "counter staff", driver: "driver", conductor: "conductor", manager: "manager", admin: "admin", super_admin: "super admin" };

/* ------------------------------------------------------------------ users */

export function Users({ me }) {
  const [q, setQ] = useState({ search: "", role: "" });
  const [applied, setApplied] = useState({ page: 1 });
  const list = useLoad(() => adminApi.users({ ...applied, limit: 25 }), [JSON.stringify(applied)]);
  const [openForm, form] = useForm();
  const [ask, confirmNode] = useConfirm();
  const superAdmin = me.role === "super_admin";
  const locations = useLoad(() => adminApi.locations(), []);
  const terminalOpts = (locations.data?.terminals ?? []).filter((t) => t.isActive).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }));

  const role = (u) =>
    openForm({
      title: `Role · ${u.fullName || u.email || u.phone}`,
      note: superAdmin
        ? "Counter staff must have a terminal: they sell tickets and make vouchers there only. Managers may also have one. A conductor still needs to be linked on the Conductors page. Only super admins give manager and admin roles."
        : "Counter staff must have a terminal. Only a super admin can give or change manager and admin roles.",
      fields: [
        { name: "role", label: "Role", type: "select", required: true, options: superAdmin ? ROLES : ROLES.filter((r) => ADMIN_GIVES.includes(r.value)) },
        { name: "terminalId", label: "Terminal (counter staff and managers)", type: "select", numeric: true, nullable: true, options: terminalOpts, hint: "Required for counter staff. Ignored for other roles." },
      ],
      initial: { role: u.role, terminalId: u.terminalId ?? "" },
      onSubmit: (b) => act(() => adminApi.setRole(u.id, { role: b.role, terminalId: b.terminalId ?? null }), "Role changed").then((ok) => (ok && list.reload(), ok)),
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
          { key: "role", label: "Role", render: (r) => <><Badge tone={r.role === "customer" ? "grey" : "blue"}>{ROLE_SHORT[r.role] ?? r.role}</Badge>{r.terminalName ? <div className="mt-1 text-xs text-mute">{r.terminalName}</div> : null}</> },
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
                  {(superAdmin || ADMIN_GIVES.includes(r.role)) && <Btn small onClick={() => role(r)}>Role</Btn>}
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

// Activity log: its own file (readable details window, filters).
export { Activity } from "./ActivityLog";
