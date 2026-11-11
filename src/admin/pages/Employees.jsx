/**
 * Employee registration (IT/HR = admins), in the layout of New Khan's "Employee Registration" sheet.
 *   Employees       /admin/employees            list, search, expiry warnings, register / edit, link a login
 *   EmployeeLists   /admin/employee-lists       departments, designations, licence types, issuing authorities
 *   EmployeePrint   /admin/employee-print/:id   the printed registration form (A4)
 * The employee ID shown on a new form is only a preview: the database assigns it when the employee is saved.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, Filters, fmtD, Input, Label, Modal, Page, Section, Select, StatusBadge, Table, useForm, useLoad } from "../ui";
import { Pager } from "./Operations";

const MARITAL = [["single", "Single"], ["married", "Married"], ["widowed", "Widowed"], ["divorced", "Divorced"]];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ROLE_LABEL = { agent: "Counter staff", driver: "Driver", conductor: "Conductor", manager: "Manager", admin: "Admin" };

/** Expiry badge: red when passed, amber within 30 days. */
function ExpiryBadge({ date, expired, soon, what }) {
  if (!date) return <span className="text-mute">–</span>;
  return (
    <span>
      {fmtD(date)} {expired ? <Badge tone="red">{what} expired</Badge> : soon ? <Badge tone="amber">expires soon</Badge> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ list */

export function Employees({ me }) {
  const [f, setF] = useState({ q: "", designationId: "", status: "active", expiring: false, page: 1 });
  const [q, setQ] = useState("");
  const lists = useLoad(() => adminApi.employeeLists(), []);
  const list = useLoad(
    () => adminApi.employees({ q: f.q || undefined, designationId: f.designationId || undefined, status: f.status, expiring: f.expiring ? "true" : undefined, page: f.page, limit: 25 }),
    [f],
  );
  const [editing, setEditing] = useState(null); // null | { } new | employee
  const [linking, setLinking] = useState(null);
  const w = list.data?.warnings;
  const designations = lists.data?.designations ?? [];

  return (
    <Page
      title="Employees"
      intro="Every member of staff, registered by IT/HR when they are hired. Drivers and conductors registered here appear in Bus & crew; hostesses and cashiers in their dropdowns."
      actions={<Btn kind="primary" onClick={() => setEditing({})} disabled={!lists.data}>+ Register employee</Btn>}
    >
      {(w?.licences > 0 || w?.cnics > 0) && (
        <button type="button" onClick={() => setF({ ...f, expiring: true, page: 1 })} className="mb-4 block w-full rounded-xl border border-amber-400 bg-amber-50 p-3 text-start text-sm text-amber-950">
          <b>Expiring within 30 days (or already expired):</b> {w.licences} licence{w.licences === 1 ? "" : "s"}, {w.cnics} CNIC{w.cnics === 1 ? "" : "s"}. Click to see them.
        </button>
      )}
      <Filters>
        <form onSubmit={(e) => { e.preventDefault(); setF({ ...f, q: q.trim(), page: 1 }); }} className="flex items-end gap-2">
          <div>
            <Label htmlFor="em-q">Employee ID, name, CNIC or phone</Label>
            <Input id="em-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="NK-00001" />
          </div>
          <Btn type="submit">Search</Btn>
        </form>
        <div>
          <Label htmlFor="em-d">Designation</Label>
          <Select id="em-d" value={f.designationId} onChange={(e) => setF({ ...f, designationId: e.target.value, page: 1 })}
            options={[{ value: "", label: "All" }, ...designations.map((d) => ({ value: d.id, label: d.name }))]} />
        </div>
        <div>
          <Label htmlFor="em-s">Status</Label>
          <Select id="em-s" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}
            options={[{ value: "active", label: "Working" }, { value: "left", label: "Left" }, { value: "all", label: "All" }]} />
        </div>
        {f.expiring && <Btn onClick={() => setF({ ...f, expiring: false, page: 1 })}>Show all, not only expiring</Btn>}
      </Filters>
      <ErrorNote err={list.err || lists.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data?.data}
        empty="No employees found."
        cols={[
          { key: "employeeCode", label: "Employee ID", render: (e) => <b className="font-mono">{e.employeeCode}</b> },
          { key: "fullName", label: "Name", render: (e) => <><b>{e.fullName}</b>{e.phone && <div className="text-xs text-mute">{e.phone}</div>}</> },
          { key: "designation", label: "Designation", render: (e) => <>{e.designation ?? <Badge tone="amber">not set</Badge>}{e.department && <div className="text-xs text-mute">{e.department}</div>}</> },
          { key: "cnic", label: "CNIC", render: (e) => <><span className="font-mono text-xs">{e.cnic ?? "–"}</span>{e.cnicExpiry && <div className="text-xs"><ExpiryBadge date={e.cnicExpiry} soon={e.cnicExpiring} what="CNIC" /></div>}</> },
          { key: "licence", label: "Licence", render: (e) => (e.licenceNo ? <><span className="font-mono text-xs">{e.licenceNo}</span><div className="text-xs"><ExpiryBadge date={e.licenceExpiry} expired={e.licenceExpired} soon={e.licenceExpiring} what="licence" /></div></> : <span className="text-mute">–</span>) },
          { key: "login", label: "Login", render: (e) => (e.userId ? <><Badge tone="blue">{ROLE_LABEL[e.loginRole] ?? e.loginRole}</Badge><div className="text-xs text-mute">{e.loginEmail}</div></> : <span className="text-mute">no login</span>) },
          { key: "isActive", label: "Status", render: (e) => <StatusBadge s={e.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (e) => (
              <div className="flex flex-wrap gap-1">
                <Btn small onClick={() => setEditing(e)}>Edit</Btn>
                <Btn small onClick={() => setLinking(e)}>Login…</Btn>
                <a className="btn btn-ghost !min-h-8 !px-2.5 !py-0 text-xs" href={`/admin/employee-print/${e.id}`} target="_blank" rel="noreferrer">Print</a>
              </div>
            ),
          },
        ]}
      />
      <Pager p={list.data?.pagination} onPage={(page) => setF({ ...f, page })} />
      {editing && lists.data && <EmployeeForm employee={editing.id ? editing : null} lists={lists.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
      {linking && <LoginModal employee={linking} me={me} onClose={() => setLinking(null)} onSaved={() => { setLinking(null); list.reload(); }} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ register / edit */

const blankForm = (e, lists) => ({
  fullName: e?.fullName ?? "", departmentId: e?.departmentId ?? (lists.departments.filter((d) => d.isActive).length === 1 ? lists.departments.find((d) => d.isActive).id : ""), designationId: e?.designationId ?? "", joiningDate: e?.joiningDate ?? "",
  cnic: e?.cnic ?? "", cnicExpiry: e?.cnicExpiry ?? "", maritalStatus: e?.maritalStatus ?? "", currentAddress: e?.currentAddress ?? "",
  permanentAddress: e?.permanentAddress ?? "", city: e?.city ?? "", phone: e?.phone ?? "", bloodGroup: e?.bloodGroup ?? "",
  licenceNo: e?.licenceNo ?? "", licenceTypeId: e?.licenceTypeId ?? "", licenceExpiry: e?.licenceExpiry ?? "", licenceAuthority: e?.licenceAuthority ?? "",
  notes: e?.notes ?? "", isActive: e?.isActive ?? true, leftOn: e?.leftOn ?? "",
});

function EmployeeForm({ employee, lists, onClose, onSaved }) {
  const [v, setV] = useState(() => blankForm(employee, lists));
  const [code, setCode] = useState(employee?.employeeCode ?? "");
  const [busy, setBusy] = useState(false);
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  // New form: show the ID this employee will get. It is only taken when the form is saved.
  useEffect(() => {
    if (!employee) adminApi.nextEmployeeCode().then(setCode, () => setCode(""));
  }, [employee]);

  const desig = lists.designations.find((d) => String(d.id) === String(v.designationId));
  const isDriver = desig?.crew === "driver";
  const opts = (rows, current) => rows.filter((r) => r.isActive || String(r.id) === String(current)).map((r) => ({ value: r.id, label: r.name }));
  const authorityOpts = lists.authorities.filter((a) => a.isActive || a.name === v.licenceAuthority).map((a) => ({ value: a.name, label: a.name }));

  async function submit(e) {
    e.preventDefault();
    const body = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === "isActive") body[k] = Boolean(x);
      else if (x === "" || x === null) body[k] = employee ? null : undefined;
      else if (["departmentId", "designationId", "licenceTypeId"].includes(k)) body[k] = Number(x);
      else body[k] = typeof x === "string" ? x.trim() : x;
    }
    if (!employee) for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    if (!employee) delete body.leftOn;
    body.fullName = v.fullName.trim();
    body.designationId = Number(v.designationId);
    setBusy(true);
    let saved;
    const ok = await act(async () => {
      saved = employee ? await adminApi.updateEmployee(employee.id, body) : await adminApi.createEmployee(body);
    }, employee ? "Employee saved" : "Employee registered");
    setBusy(false);
    if (ok) {
      if (!employee) act(async () => {}, `Employee ID ${saved.employeeCode}`, saved.employeeCode !== code ? "Someone else registered an employee at the same moment, so this is the next free ID." : "");
      onSaved(saved);
    }
  }

  const field = (k, label, props = {}) => (
    <div>
      <Label htmlFor={`ef-${k}`}>{label}{props.required ? " *" : ""}</Label>
      <Input id={`ef-${k}`} value={v[k]} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );
  const select = (k, label, options, props = {}) => (
    <div>
      <Label htmlFor={`ef-${k}`}>{label}{props.required ? " *" : ""}</Label>
      <Select id={`ef-${k}`} value={v[k]} onChange={(e) => set(k, e.target.value)} options={[{ value: "", label: props.required ? "— choose —" : "—" }, ...options]} {...props} />
    </div>
  );

  return (
    <Modal title={employee ? `Edit ${employee.employeeCode} · ${employee.fullName}` : "Employee registration"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-5">
        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-extrabold uppercase tracking-wide">Employee</legend>
          <div>
            <Label htmlFor="ef-code">Employee ID</Label>
            <Input id="ef-code" value={code || "…"} readOnly disabled className="font-mono" />
            {!employee && <p className="mt-1 text-xs text-mute">Assigned when the employee is saved. Closing the form does not use it up.</p>}
          </div>
          {field("fullName", "Employee name", { required: true, minLength: 2, maxLength: 120 })}
          {select("departmentId", "Department", opts(lists.departments, v.departmentId))}
          {select("designationId", "Designation", opts(lists.designations, v.designationId), { required: true })}
          {field("joiningDate", "Joining date", { type: "date" })}
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-extrabold uppercase tracking-wide">Personal</legend>
          {field("cnic", "CNIC", { placeholder: "35202-1234567-1", inputMode: "numeric" })}
          {field("cnicExpiry", "CNIC expiry", { type: "date" })}
          {select("maritalStatus", "Status", MARITAL.map(([value, label]) => ({ value, label })))}
          {field("phone", "Contact #", { placeholder: "03001234567", inputMode: "tel", required: isDriver || desig?.crew === "conductor" })}
          {select("bloodGroup", "Blood group", BLOOD.map((b) => ({ value: b, label: b })))}
          {field("city", "City", { maxLength: 80 })}
          <div className="sm:col-span-2 lg:col-span-3 grid gap-3 sm:grid-cols-2">
            {field("currentAddress", "Current address", { maxLength: 300 })}
            {field("permanentAddress", "Permanent address", { maxLength: 300 })}
          </div>
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-2 text-sm font-extrabold uppercase tracking-wide">Licence details {isDriver ? "(required for drivers)" : "(drivers)"}</legend>
          {field("licenceNo", "Licence no.", { required: isDriver, maxLength: 40 })}
          {select("licenceTypeId", "Licence type", opts(lists.licenceTypes, v.licenceTypeId))}
          {field("licenceExpiry", "Licence expiry", { type: "date", required: isDriver })}
          {select("licenceAuthority", "Issuing authority", authorityOpts)}
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-extrabold uppercase tracking-wide">Other details</legend>
          <textarea aria-label="Other details" rows={3} maxLength={1000} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm" />
          {employee && (
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-black" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
                Still working at New Khan
              </label>
              {!v.isActive && field("leftOn", "Left on", { type: "date" })}
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : employee ? "Save" : "Register employee"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ login */

function LoginModal({ employee, me, onClose, onSaved }) {
  const [search, setSearch] = useState(employee.loginEmail ?? "");
  const [found, setFound] = useState(null);
  const [userId, setUserId] = useState(employee.userId ?? "");
  const [role, setRole] = useState(employee.loginRole ?? employee.suggestedRole ?? "agent");
  const [terminalId, setTerminalId] = useState(employee.loginTerminalId ?? "");
  const [busy, setBusy] = useState(false);
  const locs = useLoad(() => adminApi.locations(), []);
  const superAdmin = me?.role === "super_admin";
  const roles = Object.entries(ROLE_LABEL).filter(([r]) => superAdmin || !["manager", "admin"].includes(r));

  async function find(e) {
    e.preventDefault();
    try {
      const r = await adminApi.users({ search: search.trim(), limit: 10 });
      setFound(r.data.filter((u) => u.role !== "super_admin"));
    } catch (x) {
      act(() => Promise.reject(x));
    }
  }
  async function save(unlink = false) {
    setBusy(true);
    const ok = await act(
      () => adminApi.linkEmployeeLogin(employee.id, unlink ? { userId: null } : { userId, role, terminalId: terminalId === "" ? null : Number(terminalId) }),
      unlink ? "Login removed" : "Login linked",
    );
    setBusy(false);
    if (ok) onSaved();
  }

  return (
    <Modal title={`Login · ${employee.employeeCode} ${employee.fullName}`} onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm text-mute">
          The employee signs up on the website with their email or phone. Find their account here, choose what they may do, and link it.
          {employee.suggestedRole && <> Suggested for a {employee.designation}: <b>{ROLE_LABEL[employee.suggestedRole]}</b>.</>}
        </p>
        <form onSubmit={find} className="flex items-end gap-2">
          <div className="grow">
            <Label htmlFor="lg-s">Their email, phone or name</Label>
            <Input id="lg-s" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Btn type="submit">Find</Btn>
        </form>
        {found && (
          found.length ? (
            <div className="grid gap-1">
              {found.map((u) => (
                <label key={u.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${userId === u.id ? "border-black bg-neutral-100" : "border-neutral-300"}`}>
                  <input type="radio" name="lg-u" checked={userId === u.id} onChange={() => setUserId(u.id)} className="accent-black" />
                  <b>{u.fullName || "–"}</b> <span className="text-mute">{u.email ?? u.phone} · now {u.role}</span>
                </label>
              ))}
            </div>
          ) : <p className="text-sm">No account found. Ask the employee to sign up on the website first.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="lg-r">Role</Label>
            <Select id="lg-r" value={role} onChange={(e) => setRole(e.target.value)} options={roles.map(([value, label]) => ({ value, label }))} />
          </div>
          {["agent", "manager"].includes(role) && (
            <div>
              <Label htmlFor="lg-t">Terminal{role === "agent" ? " *" : ""}</Label>
              <Select id="lg-t" value={terminalId} onChange={(e) => setTerminalId(e.target.value)}
                options={[{ value: "", label: "—" }, ...(locs.data?.terminals ?? []).filter((t) => t.isActive).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }))]} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn kind="primary" disabled={busy || !userId} onClick={() => save(false)}>Link login</Btn>
          {employee.userId && <Btn kind="danger" disabled={busy} onClick={() => save(true)}>Remove login</Btn>}
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ lists */

const LISTS = [
  ["departments", "departments", "Departments"],
  ["designations", "designations", "Designations"],
  ["licence-types", "licenceTypes", "Licence types"],
  ["licence-authorities", "authorities", "Issuing authorities"],
];

export function EmployeeLists() {
  const lists = useLoad(() => adminApi.employeeLists(), []);
  const [openForm, form] = useForm();
  const reload = (ok) => (ok && lists.reload(), ok);
  return (
    <Page title="Employee lists" intro="The choices on the employee registration form. Deactivate instead of deleting, so existing employees keep their values.">
      <ErrorNote err={lists.err} onRetry={lists.reload} />
      {LISTS.map(([path, key, title]) => (
        <Section key={path} title={title} actions={<Btn small kind="primary" onClick={() => openForm({ title: `Add to ${title.toLowerCase()}`, fields: [{ name: "name", label: "Name", type: "text", required: true }], onSubmit: (b) => act(() => adminApi.addEmployeeListItem(path, b.name), "Added").then(reload) })}>+ Add</Btn>}>
          <Table
            loading={lists.loading}
            rows={lists.data?.[key]}
            cols={[
              { key: "name", label: "Name", render: (x) => <b className={x.isActive ? "" : "text-neutral-500 line-through"}>{x.name}</b> },
              ...(key === "designations" ? [{ key: "crew", label: "Used for", render: (x) => (x.crew ? <Badge tone="blue">{x.crew} dropdown</Badge> : "–") }] : []),
              { key: "s", label: "Status", render: (x) => (x.isActive ? <Badge tone="green">active</Badge> : <Badge tone="red">inactive</Badge>) },
              {
                key: "a",
                label: "",
                render: (x) => (
                  <div className="flex gap-1">
                    <Btn small onClick={() => openForm({ title: `Rename ${x.name}`, fields: [{ name: "name", label: "Name", type: "text", required: true }], initial: x, onSubmit: (b) => act(() => adminApi.updateEmployeeListItem(path, x.id, { name: b.name }), "Saved").then(reload) })}>Rename</Btn>
                    <Btn small onClick={() => act(() => adminApi.updateEmployeeListItem(path, x.id, { isActive: !x.isActive }), x.isActive ? "Deactivated" : "Activated").then(reload)}>{x.isActive ? "Deactivate" : "Activate"}</Btn>
                  </div>
                ),
              },
            ]}
          />
        </Section>
      ))}
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ printed form */

export function EmployeePrint() {
  const { id } = useParams();
  const e = useLoad(() => adminApi.employee(id), [id]);
  useEffect(() => {
    if (e.data) document.title = `${e.data.employeeCode} · ${e.data.fullName}`;
  }, [e.data]);
  if (e.err) return <div className="p-6"><ErrorNote err={e.err} onRetry={e.reload} /></div>;
  const x = e.data;
  if (!x) return <p className="p-6 text-sm">Loading…</p>;
  const row = (label, value) => (
    <div className="flex gap-2 border-b border-neutral-300 py-1.5">
      <span className="w-40 shrink-0 text-neutral-600">{label}</span>
      <span className="font-semibold">{value || "—"}</span>
    </div>
  );
  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-3 flex max-w-[210mm] justify-end gap-2 print:hidden">
        <Btn kind="primary" onClick={() => window.print()}>Print</Btn>
        <Link to="/admin/employees" className="btn btn-ghost !min-h-10 !px-4 !py-1 text-sm">Back</Link>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[11pt] text-black shadow print:shadow-none">
        <div className="mb-6 bg-[#b4c6e7] py-2 text-center font-bold text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="text-[15pt]">NEW KHAN ROAD RUNNERS (PVT) LIMITED</div>
          <div className="text-[13pt]">EMPLOYEE REGISTRATION</div>
        </div>
        <div className="grid grid-cols-2 gap-x-10">
          <div>
            {row("Employee Code", x.employeeCode)}
            {row("Employee Name", x.fullName)}
            {row("Department", x.department)}
            {row("Designation", x.designation)}
            {row("Joining date", x.joiningDate && fmtD(x.joiningDate))}
          </div>
          <div>
            {row("CNIC", x.cnic)}
            {row("CNIC Expiry", x.cnicExpiry && fmtD(x.cnicExpiry))}
            {row("Status", MARITAL.find(([k]) => k === x.maritalStatus)?.[1])}
            {row("City", x.city)}
            {row("Contact #", x.phone)}
            {row("Blood Group", x.bloodGroup)}
          </div>
        </div>
        <div className="mt-3">
          {row("Current address", x.currentAddress)}
          {row("Permanent address", x.permanentAddress)}
        </div>
        <h2 className="mt-6 mb-1 font-bold">Licence Details</h2>
        <div className="grid grid-cols-2 gap-x-10">
          <div>
            {row("Licence No", x.licenceNo)}
            {row("Licence Type", x.licenceType)}
          </div>
          <div>
            {row("Licence Expiry", x.licenceExpiry && fmtD(x.licenceExpiry))}
            {row("Issuing Authority", x.licenceAuthority)}
          </div>
        </div>
        <h2 className="mt-6 mb-1 font-bold">Other Details</h2>
        <p className="min-h-[30mm] whitespace-pre-wrap border border-neutral-300 p-2">{x.notes}</p>
        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-black pt-1">Employee signature</div>
          <div className="border-t border-black pt-1">HR / authorised signature</div>
        </div>
      </div>
    </div>
  );
}
