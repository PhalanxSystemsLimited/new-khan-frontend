/** Fleet and places: buses, drivers, seat layouts (read-only), cities and terminals used by booking. */
import { Link } from "react-router-dom";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, fmtD, Page, Section, StatusBadge, Table, useForm, useLoad } from "../ui";
import { BUS_CLASSES } from "./Network";
import { useEmployeeEditor } from "./employeeEditor";

/** Shown when no active designation is used for the driver / conductor dropdown, so the Add button cannot work. */
const NoDesignation = ({ what }) => (
  <p role="alert" className="mb-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
    No active designation is used for the {what} dropdown, so a {what} cannot be added here. Check Fleet &amp; people → <Link to="/admin/employee-lists" className="font-semibold underline">Employee lists</Link> → Designations.
  </p>
);

const AMENITIES = ["ac", "wifi", "charging", "snacks", "lcd", "washroom", "blanket", "water", "gps"].map((a) => ({ value: a, label: a }));

/* ------------------------------------------------------------------ buses */

export function Buses() {
  const buses = useLoad(() => adminApi.buses(), []);
  const layouts = useLoad(() => adminApi.layouts(), []);
  const [openForm, form] = useForm();
  const layoutOpts = (layouts.data ?? []).map((l) => ({ value: l.id, label: `${l.name} (${l.totalSeats ?? "?"} seats)` }));

  const fields = [
    { name: "registrationNo", label: "Registration no.", type: "text", required: true, placeholder: "LES-1234" },
    { name: "fleetNo", label: "Fleet no.", type: "text", placeholder: "NK-07" },
    { name: "layoutId", label: "Seat layout", type: "select", numeric: true, required: true, options: layoutOpts, hint: "Can't be changed while future trips on this bus have bookings." },
    { name: "busClass", label: "Class", type: "select", required: true, options: BUS_CLASSES },
    { name: "make", label: "Make", type: "text", placeholder: "Higer" },
    { name: "model", label: "Model", type: "text" },
    { name: "manufactureYear", label: "Year", type: "number", min: 1980, max: 2100 },
    { name: "amenities", label: "Amenities", type: "multi", options: AMENITIES },
    // Shown once the database has the column (db/migrations/2026-11-07-round-trip-reports.sql).
    ...(buses.data?.some((b) => "hasHostess" in b)
      ? [{ name: "hasHostess", label: "Hostess", type: "checkbox", checkLabel: "Carries a hostess (adds the Daily hostess off-route expense)" }]
      : []),
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "In service" },
  ];
  // Only send the layout when it changed: the server refuses any layout change on a bus with booked future trips.
  const save = (id, was) => (b) => {
    const body = id && was && b.layoutId === was.layoutId ? (({ layoutId, ...rest }) => rest)(b) : b; // eslint-disable-line no-unused-vars
    return act(() => (id ? adminApi.updateBus(id, body) : adminApi.createBus(body)), "Bus saved").then((ok) => (ok && buses.reload(), ok));
  };

  return (
    <Page
      title="Buses"
      intro="Coaches in the fleet. A trip's seat map comes from its bus's seat layout."
      actions={<Btn kind="primary" onClick={() => openForm({ title: "Add a bus", fields, initial: { busClass: "executive", isActive: true, amenities: ["ac"] }, onSubmit: save() })}>+ Add bus</Btn>}
    >
      <ErrorNote err={buses.err || layouts.err} onRetry={buses.reload} />
      <Table
        loading={buses.loading}
        rows={buses.data}
        cols={[
          { key: "registrationNo", label: "Registration", render: (r) => <b>{r.registrationNo}</b> },
          { key: "fleetNo", label: "Fleet no." },
          { key: "layoutName", label: "Layout", render: (r) => `${r.layoutName} · ${r.totalSeats} seats` },
          { key: "busClass", label: "Class" },
          { key: "m", label: "Make / model", render: (r) => [r.make, r.model, r.manufactureYear].filter(Boolean).join(" ") || "–" },
          { key: "amenities", label: "Amenities", render: (r) => [...(r.amenities ?? []), ...(r.hasHostess ? ["hostess"] : [])].join(", ") || "–" },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (r) => (
              <Btn small onClick={() => openForm({ title: `Edit ${r.registrationNo}`, fields, initial: { ...r, fleetNo: r.fleetNo ?? "", make: r.make ?? "", model: r.model ?? "", manufactureYear: r.manufactureYear ?? "", amenities: r.amenities ?? [] }, onSubmit: save(r.id, r) })}>
                Edit
              </Btn>
            ),
          },
        ]}
      />
      <Section title="Seat layouts">
        <p className="mb-3 text-sm text-mute">Seat plans buses can use. New layouts are added by the developer (POST /fleet/layouts), since each seat's position is set one by one.</p>
        <Table
          loading={layouts.loading}
          rows={layouts.data}
          cols={[
            { key: "name", label: "Name", render: (r) => <b>{r.name}</b> },
            { key: "totalSeats", label: "Seats" },
            { key: "g", label: "Grid", render: (r) => `${r.rowCount ?? "?"} rows × ${r.colCount ?? "?"} columns${r.decks > 1 ? `, ${r.decks} decks` : ""}` },
          ]}
        />
      </Section>
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ drivers */

export function Drivers() {
  const list = useLoad(() => adminApi.drivers(), []);
  const [openForm, form] = useForm();
  const fields = [
    { name: "fullName", label: "Full name", type: "text", required: true },
    { name: "phone", label: "Phone", type: "text", required: true, placeholder: "03001234567" },
    { name: "cnic", label: "CNIC", type: "text", placeholder: "35202-1234567-1" },
    { name: "licenseNo", label: "Licence no.", type: "text", required: true },
    { name: "licenseExpiry", label: "Licence expiry", type: "date", required: true, hint: "Drivers with an expired licence can't be assigned to trips." },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Can be assigned to trips" },
  ];
  const save = (id) => (b) => act(() => (id ? adminApi.updateDriver(id, b) : adminApi.createDriver(b)), "Driver saved").then((ok) => (ok && list.reload(), ok));
  const emp = useEmployeeEditor("driver", list.reload);
  return (
    <Page
      title="Drivers"
      intro="Drivers are employees with the designation Driver; their licence details are on their employee record. Drivers listed here can be assigned to trips."
      actions={<Btn kind="primary" disabled={!emp.canAdd} onClick={emp.add}>+ Add driver</Btn>}
    >
      {emp.noDesignation && <NoDesignation what="driver" />}
      <ErrorNote err={list.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data}
        cols={[
          { key: "fullName", label: "Name", render: (r) => <b>{r.fullName}</b> },
          { key: "phone", label: "Phone" },
          { key: "cnic", label: "CNIC" },
          { key: "licenseNo", label: "Licence" },
          { key: "licenseExpiry", label: "Expires", render: (r) => <>{fmtD(r.licenseExpiry)} {r.licenseExpired && <Badge tone="red">expired</Badge>}</> },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (r) =>
              r.employeeId ? (
                <Btn small disabled={emp.opening || !emp.listsReady} onClick={() => emp.edit(r.employeeId)}>Edit</Btn>
              ) : (
                <Btn small onClick={() => openForm({ title: `Edit ${r.fullName}`, fields, initial: { ...r, cnic: r.cnic ?? "" }, onSubmit: save(r.id) })}>Edit</Btn>
              ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-neutral-600">
        Full details, printing and leaving dates: <Link to="/admin/employees" className="font-semibold underline">Employees</Link>.
      </p>
      {form}
      {emp.node}
    </Page>
  );
}

/* ------------------------------------------------------------------ conductors */

export function Conductors() {
  const list = useLoad(() => adminApi.conductors(), []);
  // Login accounts that have the Conductor role (given under Users & staff).
  const logins = useLoad(() => adminApi.users({ role: "conductor", limit: 100 }), []);
  const [openForm, form] = useForm();
  const loginOpts = (logins.data?.data ?? []).map((u) => ({ value: u.id, label: `${u.fullName || "–"} · ${u.email ?? u.phone ?? ""}` }));
  const fields = [
    { name: "fullName", label: "Full name", type: "text", required: true },
    { name: "phone", label: "Phone", type: "text", required: true, placeholder: "03001234567" },
    { name: "cnic", label: "CNIC", type: "text", placeholder: "35202-1234567-1" },
    {
      name: "userId", label: "Login account", type: "select", nullable: true, options: loginOpts,
      hint: "So the conductor can sign in and use the conductor screen: they sign up on the website, an admin gives the account the Conductor role (Users & staff), then you pick it here.",
    },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Can be assigned to trips" },
  ];
  const save = (id) => (b) => act(() => (id ? adminApi.updateConductor(id, b) : adminApi.createConductor(b)), "Conductor saved").then((ok) => (ok && list.reload(), ok));
  const emp = useEmployeeEditor("conductor", list.reload);
  return (
    <Page
      title="Conductors"
      intro="Every bus needs a conductor before it can leave. Conductors are employees with the designation Conductor / Fare Collector; link their login on the Employees page."
      actions={<Btn kind="primary" disabled={!emp.canAdd} onClick={emp.add}>+ Add conductor</Btn>}
    >
      {emp.noDesignation && <NoDesignation what="conductor" />}
      <ErrorNote err={list.err || logins.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data}
        empty="No conductors yet."
        cols={[
          { key: "fullName", label: "Name", render: (r) => <b>{r.fullName}</b> },
          { key: "phone", label: "Phone" },
          { key: "cnic", label: "CNIC", render: (r) => r.cnic ?? "–" },
          { key: "login", label: "Login", render: (r) => (r.userId ? r.loginEmail ?? r.loginName ?? "linked" : <Badge tone="amber">no login</Badge>) },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (r) =>
              r.employeeId ? (
                <Btn small disabled={emp.opening || !emp.listsReady} onClick={() => emp.edit(r.employeeId)}>Edit</Btn>
              ) : (
                <Btn small onClick={() => openForm({ title: `Edit ${r.fullName}`, fields, initial: { ...r, cnic: r.cnic ?? "", userId: r.userId ?? "" }, onSubmit: save(r.id) })}>Edit</Btn>
              ),
          },
        ]}
      />
      <p className="mt-3 text-xs text-neutral-600">
        Full details, printing, leaving dates and logins: <Link to="/admin/employees" className="font-semibold underline">Employees</Link>.
      </p>
      {form}
      {emp.node}
    </Page>
  );
}

/* ------------------------------------------------------------------ staff directory */

const JOBS = [
  { value: "cleaner", label: "Cleaner" },
  { value: "loader", label: "Loader" },
  { value: "helper", label: "Helper" },
  { value: "guard", label: "Guard" },
  { value: "other", label: "Other" },
];

export function StaffDirectory() {
  const list = useLoad(() => adminApi.staffDirectory(), []);
  const locs = useLoad(() => adminApi.locations(), []);
  const [openForm, form] = useForm();
  const terminalOpts = (locs.data?.terminals ?? []).map((t) => ({ value: t.id, label: `${t.cityName} · ${t.name}` }));
  const fields = [
    { name: "fullName", label: "Full name", type: "text", required: true },
    { name: "job", label: "Job", type: "select", required: true, options: JOBS },
    { name: "terminalId", label: "Terminal", type: "select", numeric: true, nullable: true, options: terminalOpts },
    { name: "phone", label: "Phone", type: "text", placeholder: "03001234567" },
    { name: "cnic", label: "CNIC", type: "text", placeholder: "35202-1234567-1" },
    { name: "notes", label: "Notes", type: "text" },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Still working" },
  ];
  const save = (id) => (b) => act(() => (id ? adminApi.updateStaffMember(id, b) : adminApi.createStaffMember(b)), "Saved").then((ok) => (ok && list.reload(), ok));
  return (
    <Page
      title="Staff directory"
      intro="People who work at terminals or on buses but do not sign in (cleaners, loaders, helpers…). Staff who sign in are managed under Users & staff."
      actions={<Btn kind="primary" onClick={() => openForm({ title: "Add a person", fields, initial: { job: "cleaner", isActive: true }, onSubmit: save() })}>+ Add person</Btn>}
    >
      <ErrorNote err={list.err || locs.err} onRetry={list.reload} />
      <Table
        loading={list.loading}
        rows={list.data}
        empty="Nobody listed yet."
        cols={[
          { key: "fullName", label: "Name", render: (r) => <b>{r.fullName}</b> },
          { key: "job", label: "Job", render: (r) => JOBS.find((j) => j.value === r.job)?.label ?? r.job },
          { key: "terminalName", label: "Terminal", render: (r) => r.terminalName ?? "–" },
          { key: "phone", label: "Phone", render: (r) => r.phone ?? "–" },
          { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
          {
            key: "a",
            label: "",
            render: (r) => (
              <Btn small onClick={() => openForm({ title: `Edit ${r.fullName}`, fields, initial: { ...r, phone: r.phone ?? "", cnic: r.cnic ?? "", notes: r.notes ?? "", terminalId: r.terminalId ?? "" }, onSubmit: save(r.id) })}>Edit</Btn>
            ),
          },
        ]}
      />
      {form}
    </Page>
  );
}

/* ------------------------------------------------------------------ cities and terminals */

export function Locations() {
  const locs = useLoad(() => adminApi.locations(), []);
  const [openForm, form] = useForm();
  const cities = locs.data?.cities ?? [];
  const cityFields = [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "province", label: "Province", type: "text" },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "Shown in booking search" },
  ];
  const termFields = [
    { name: "cityId", label: "City", type: "select", numeric: true, required: true, options: cities.map((c) => ({ value: c.id, label: c.name })) },
    { name: "name", label: "Name", type: "text", required: true, placeholder: "New Khan Mianwali Terminal" },
    { name: "code", label: "Code", type: "text", required: true, placeholder: "NK-MWI" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "latitude", label: "Latitude", type: "number", min: -90, max: 90 },
    { name: "longitude", label: "Longitude", type: "number", min: -180, max: 180 },
    { name: "isActive", label: "Active", type: "checkbox", checkLabel: "In use" },
    // Shown once the database has the column (db/migrations/2026-11-12-origin-terminals-auto-reports.sql).
    ...((locs.data?.terminals ?? []).some((t) => "isOrigin" in t)
      ? [{ name: "isOrigin", label: "Origin terminal", type: "checkbox", checkLabel: "Round trips start and end here (Lahore, Multan): a bus arriving here closes its round trip report" }]
      : []),
  ];
  const saveCity = (id) => (b) => act(() => (id ? adminApi.updateCity(id, b) : adminApi.createCity(b)), "City saved").then((ok) => (ok && locs.reload(), ok));
  const saveTerm = (id) => (b) => act(() => (id ? adminApi.updateTerminal(id, b) : adminApi.createTerminal(b)), "Terminal saved").then((ok) => (ok && locs.reload(), ok));
  const blank = (r, keys) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, r[k] ?? ""])) });

  return (
    <Page title="Cities & terminals" intro="Places used by booking: the From / To lists and route stops. The Terminals page that visitors read (addresses, hours) is edited under Website content.">
      <ErrorNote err={locs.err} onRetry={locs.reload} />
      <Section title="Cities" actions={<Btn kind="primary" small onClick={() => openForm({ title: "Add a city", fields: cityFields, initial: { isActive: true }, onSubmit: saveCity() })}>+ Add city</Btn>}>
        <Table
          loading={locs.loading}
          rows={cities}
          cols={[
            { key: "name", label: "Name", render: (r) => <b>{r.name}</b> },
            { key: "province", label: "Province" },
            { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
            { key: "a", label: "", render: (r) => <Btn small onClick={() => openForm({ title: `Edit ${r.name}`, fields: cityFields, initial: blank(r, ["province"]), onSubmit: saveCity(r.id) })}>Edit</Btn> },
          ]}
        />
      </Section>
      <Section title="Terminals" actions={<Btn kind="primary" small onClick={() => openForm({ title: "Add a terminal", fields: termFields, initial: { isActive: true }, onSubmit: saveTerm() })}>+ Add terminal</Btn>}>
        <Table
          loading={locs.loading}
          rows={locs.data?.terminals}
          cols={[
            { key: "name", label: "Name", render: (r) => <b>{r.name}</b> },
            { key: "cityName", label: "City" },
            { key: "code", label: "Code", render: (r) => <span className="font-mono">{r.code}</span> },
            { key: "address", label: "Address", className: "max-w-xs" },
            { key: "phone", label: "Phone" },
            { key: "isActive", label: "Status", render: (r) => <StatusBadge s={r.isActive ? "active" : "inactive"} /> },
            { key: "a", label: "", render: (r) => <Btn small onClick={() => openForm({ title: `Edit ${r.name}`, fields: termFields, initial: blank(r, ["address", "phone", "latitude", "longitude"]), onSubmit: saveTerm(r.id) })}>Edit</Btn> },
          ]}
        />
      </Section>
      {form}
    </Page>
  );
}
