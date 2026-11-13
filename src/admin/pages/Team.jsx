/**
 * Fleet & people > Hostesses and Cashiers.
 * Shortcuts to the employees whose designation feeds the hostess / cashier dropdown (Employee lists > Designations,
 * "Used for"). They are the SAME employee records as on the Employees page: nothing is stored twice. Adding and
 * editing use the Employees page's own form, and giving a login uses its own "link a login" step.
 *   Hostesses: trips in the next 7 days and the next trip (from Trips & boarding > Bus & crew).
 *   Cashiers:  their sign-in (Counter staff) and the round trip reports where they received the cash.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { Badge, Btn, ErrorNote, Filters, fmtD, fmtDT, Label, Page, Select, Table, useLoad } from "../ui";
import { toast } from "../../components/Toast";
import { EmployeeForm, LoginModal, ROLE_LABEL } from "./Employees";

const TEXT = {
  hostess: {
    title: "Hostesses",
    one: "hostess",
    intro:
      "Every employee whose designation is used for the hostess dropdown. Choose a hostess for a trip in Trips & boarding (Bus & crew); she then appears on the Day plan. These are the same records as on the Employees page.",
  },
  cashier: {
    title: "Cashiers",
    one: "cashier",
    intro:
      "Every employee whose designation is used for the cashier dropdown (who received the cash on a round trip report). A cashier who also uses the admin panel signs in as Counter staff. These are the same records as on the Employees page.",
  },
};

const STATUS = [
  { value: "active", label: "Working here" },
  { value: "left", label: "Left / inactive" },
  { value: "all", label: "Everyone" },
];

function Team({ kind, me }) {
  const t = TEXT[kind];
  const [status, setStatus] = useState("active");
  const list = useLoad(() => adminApi.employeeTeam(kind, status), [kind, status]);
  const lists = useLoad(() => adminApi.employeeLists(), []);
  const [editing, setEditing] = useState(null); // null | {} (new) | full employee record
  const [linking, setLinking] = useState(null);
  const [opening, setOpening] = useState(false);

  // The designation a new hostess / cashier gets: the active one used for this dropdown.
  const preset = (lists.data?.designations ?? []).find((d) => d.crew === kind && d.isActive);

  /** Edit opens the Employees page's form with the full record. */
  async function edit(row) {
    setOpening(true);
    try {
      setEditing(await adminApi.employee(row.id));
    } catch (e) {
      toast("Could not open this employee", { body: e.message || "Please try again.", kind: "error", duration: 7000 });
    }
    setOpening(false);
  }

  const name = (r) => (
    <div>
      <b className={r.isActive ? "" : "text-neutral-500"}>{r.fullName}</b>
      <div className="font-mono text-xs text-neutral-600">{r.employeeCode} · {r.designation}</div>
    </div>
  );
  const statusCol = { key: "s", label: "Status", render: (r) => (r.isActive ? <Badge tone="green">working</Badge> : <Badge tone="red">{r.leftOn ? `left ${fmtD(r.leftOn)}` : "inactive"}</Badge>) };
  const editCol = (extra) => ({
    key: "a",
    label: "",
    render: (r) => (
      <div className="flex flex-wrap gap-1">
        <Btn small disabled={opening || !lists.data} onClick={() => edit(r)}>Edit</Btn>
        {extra?.(r)}
      </div>
    ),
  });

  const cols =
    kind === "hostess"
      ? [
          { key: "n", label: "Name", render: name },
          { key: "p", label: "Phone", render: (r) => r.phone ?? "–" },
          statusCol,
          { key: "c", label: "Trips, next 7 days", render: (r) => (r.isActive ? <b>{r.tripsNext7Days ?? 0}</b> : "–") },
          {
            key: "nt",
            label: "Next trip",
            render: (r) =>
              r.nextTrip ? (
                <div className="text-sm">
                  <b>{fmtDT(r.nextTrip.departureAt)}</b>
                  <div className="text-xs text-neutral-600">{r.nextTrip.routeName} · {r.nextTrip.busNo}</div>
                </div>
              ) : (
                <span className="text-neutral-500">None planned</span>
              ),
          },
          editCol(),
        ]
      : [
          { key: "n", label: "Name", render: name },
          { key: "p", label: "Phone", render: (r) => r.phone ?? "–" },
          statusCol,
          {
            key: "l",
            label: "Sign-in",
            render: (r) =>
              r.userId ? (
                <div className="text-sm">
                  <Badge tone="blue">{ROLE_LABEL[r.loginRole] ?? r.loginRole ?? "login"}</Badge>
                  <div className="text-xs text-neutral-600">{r.loginEmail}{r.loginTerminal ? ` · ${r.loginTerminal}` : ""}</div>
                </div>
              ) : (
                <span className="text-neutral-500">No login</span>
              ),
          },
          {
            key: "rt",
            label: "Cash received (reports)",
            render: (r) => (
              <div className="text-sm">
                <b>{r.reportsLast30Days ?? 0}</b> <span className="text-neutral-600">in the last 30 days</span>
                <div className="text-xs text-neutral-600">{r.lastReportDate ? `Last: ${fmtD(`${r.lastReportDate}T12:00:00+05:00`)}` : "None yet"}</div>
              </div>
            ),
          },
          editCol((r) => r.isActive && <Btn small onClick={() => setLinking(r)}>{r.userId ? "Change login" : "Give login"}</Btn>),
        ];

  return (
    <Page
      title={t.title}
      intro={t.intro}
      actions={
        <Btn kind="primary" disabled={!lists.data || !preset} onClick={() => setEditing({})}>
          + Add {t.one}
        </Btn>
      }
    >
      <Filters>
        <div>
          <Label htmlFor={`tm-${kind}`}>Show</Label>
          <Select id={`tm-${kind}`} value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS} />
        </div>
        <Btn onClick={list.reload}>Refresh</Btn>
      </Filters>
      {lists.data && !preset && (
        <p role="alert" className="mb-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
          No active designation is used for the {t.one} dropdown, so a {t.one} cannot be added here. Check Fleet & people → <Link to="/admin/employee-lists" className="font-semibold underline">Employee lists</Link> → Designations.
        </p>
      )}
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data}
        cols={cols}
        empty={status === "active" ? `No ${t.one} registered yet. Press "+ Add ${t.one}".` : "Nobody here."}
      />
      <p className="mt-3 text-xs text-neutral-600">
        Full details, printing and leaving dates: <Link to="/admin/employees" className="font-semibold underline">Employees</Link>.
      </p>

      {editing && lists.data && (
        <EmployeeForm
          employee={editing.id ? editing : null}
          lists={lists.data}
          presetDesignationId={preset?.id ?? ""}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
      {linking && (
        <LoginModal
          employee={linking}
          me={me}
          onClose={() => setLinking(null)}
          onSaved={() => {
            setLinking(null);
            list.reload();
          }}
        />
      )}
    </Page>
  );
}

export const Hostesses = ({ me }) => <Team kind="hostess" me={me} />;
export const Cashiers = ({ me }) => <Team kind="cashier" me={me} />;
