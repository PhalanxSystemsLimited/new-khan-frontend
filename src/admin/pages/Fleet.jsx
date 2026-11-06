/** Fleet and places: buses, drivers, seat layouts (read-only), cities and terminals used by booking. */
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, fmtD, Page, Section, StatusBadge, Table, useForm, useLoad } from "../ui";
import { BUS_CLASSES } from "./Network";

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
          { key: "amenities", label: "Amenities", render: (r) => (r.amenities ?? []).join(", ") || "–" },
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
  return (
    <Page title="Drivers" actions={<Btn kind="primary" onClick={() => openForm({ title: "Add a driver", fields, initial: { isActive: true }, onSubmit: save() })}>+ Add driver</Btn>}>
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
          { key: "a", label: "", render: (r) => <Btn small onClick={() => openForm({ title: `Edit ${r.fullName}`, fields, initial: { ...r, cnic: r.cnic ?? "" }, onSubmit: save(r.id) })}>Edit</Btn> },
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
