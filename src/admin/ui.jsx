/**
 * Building blocks shared by every admin screen: page frame, table, buttons, badges, dialogs, a form described
 * by a field list, a data-loading hook, and Pakistan-time formatting. Admin screens are English only.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "../components/Toast";

/* ------------------------------------------------------------------ time (Pakistan) */

const TZ = "Asia/Karachi";
export const fmtDT = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
export const fmtD = (v) => (v ? new Date(v).toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }) : "–");
export const fmtT = (v) => (v ? new Date(v).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) : "–");
/** Today (or today + n days) in Pakistan as YYYY-MM-DD. */
export const pkDate = (addDays = 0) => new Date(Date.now() + addDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: TZ });
/** "2026-11-06T14:30" from a datetime-local input, read as Pakistan time, to an ISO string with offset. */
export const pkLocalToIso = (v) => (v ? `${v.length === 16 ? `${v}:00` : v}+05:00` : undefined);
export const rs = (n) => (n === null || n === undefined || n === "" ? "–" : `Rs ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

/* ------------------------------------------------------------------ data */

/** Runs `fn` on mount and whenever `deps` change. Returns { data, err, loading, reload, setData }. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    try {
      const d = await fn();
      if (n === seq.current) {
        setData(d);
        setErr("");
      }
    } catch (e) {
      if (n === seq.current) setErr(e.message || "Could not load");
    }
    if (n === seq.current) setLoading(false);
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, err, loading, reload, setData };
}

/** Runs an action, shows a toast for success or failure, and returns true when it worked. */
export async function act(fn, okTitle, okBody = "") {
  try {
    await fn();
    if (okTitle) toast(okTitle, { body: okBody, duration: 3500 });
    return true;
  } catch (e) {
    toast("Not saved", { body: e.message || "Something went wrong", kind: "error", duration: 7000 });
    return false;
  }
}

/* ------------------------------------------------------------------ layout pieces */

export function Page({ title, intro, actions, children }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-black">{title}</h1>
          {intro && <p className="mt-1 max-w-3xl text-sm text-mute">{intro}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function Section({ title, actions, children }) {
  return (
    <section className="mt-6 rounded-2xl border-2 border-black bg-white p-4">
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-bold text-black">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const BTN = {
  primary: "border-black bg-black text-white hover:bg-neutral-800",
  ghost: "border-black bg-white text-black hover:bg-neutral-100",
  danger: "border-red-700 bg-white text-red-800 hover:bg-red-50",
  ok: "border-green-700 bg-green-700 text-white hover:bg-green-800",
};
export function Btn({ kind = "ghost", small = false, className = "", ...p }) {
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center gap-1 rounded-xl border-2 font-bold disabled:cursor-not-allowed disabled:opacity-50 ${small ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-4 text-sm"} ${BTN[kind]} ${className}`}
    />
  );
}

const TONE = {
  green: "border-green-600 bg-green-100 text-green-900",
  amber: "border-amber-500 bg-amber-100 text-amber-900",
  red: "border-red-500 bg-red-100 text-red-900",
  grey: "border-neutral-400 bg-neutral-100 text-neutral-800",
  blue: "border-sky-500 bg-sky-100 text-sky-900",
};
export const Badge = ({ tone = "grey", children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${TONE[tone]}`}>{children}</span>
);
const STATUS_TONE = {
  confirmed: "green", completed: "green", succeeded: "green", processed: "green", arrived: "green", active: "green",
  pending: "amber", requested: "amber", delayed: "amber", boarding: "blue", departed: "blue", approved: "blue", scheduled: "grey",
  cancelled: "red", expired: "grey", refunded: "grey", rejected: "red", failed: "red", inactive: "red",
};
export const StatusBadge = ({ s }) => <Badge tone={STATUS_TONE[s] ?? "grey"}>{String(s ?? "–").replace(/_/g, " ")}</Badge>;

export function ErrorNote({ err, onRetry }) {
  if (!err) return null;
  return (
    <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      {err} {onRetry && <button type="button" onClick={onRetry} className="ms-2 font-bold underline">Try again</button>}
    </p>
  );
}

/**
 * Table. cols: [{ key, label, render?(row), className? }]. Scrolls sideways on narrow screens.
 */
export function Table({ cols, rows, empty = "Nothing here yet.", loading = false, rowKey = (r) => r.id }) {
  if (loading && !rows) return <p className="text-sm text-mute">Loading…</p>;
  if (!rows?.length) return <p className="rounded-xl border border-dashed border-neutral-400 p-4 text-sm text-mute">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-300">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase tracking-wide text-neutral-600">
          <tr>{cols.map((c) => <th key={c.key} className={`px-3 py-2 font-bold ${c.className ?? ""}`}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((r, i) => (
            <tr key={rowKey(r) ?? i} className="align-top hover:bg-neutral-50">
              {cols.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>{c.render ? c.render(r) : (r[c.key] ?? "–")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Centred dialog (native <dialog>: focus trap and Escape for free). Rendered only while open. */
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-black p-0 backdrop:bg-black/60 ${wide ? "w-[min(96vw,64rem)]" : "w-[min(94vw,34rem)]"}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <h2 className="text-lg font-bold text-black">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black">
          <svg aria-hidden viewBox="0 0 24 24" width="14" height="14"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}

/** "Are you sure?" dialog; returns a Promise<boolean> through `ask`. */
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (title, body, { danger = true, confirm = "Yes" } = {}) =>
    new Promise((resolve) => setState({ title, body, danger, confirm, resolve }));
  const close = (v) => {
    state?.resolve(v);
    setState(null);
  };
  const node = state && (
    <Modal title={state.title} onClose={() => close(false)}>
      <p className="text-neutral-800">{state.body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Btn kind={state.danger ? "danger" : "primary"} onClick={() => close(true)}>{state.confirm}</Btn>
        <Btn autoFocus onClick={() => close(false)}>Go back</Btn>
      </div>
    </Modal>
  );
  return [ask, node];
}

/* ------------------------------------------------------------------ forms */

const inputCls = "w-full rounded-xl border-2 border-black bg-white px-3 py-2 text-sm text-black";
export const Label = ({ children, htmlFor }) => <label htmlFor={htmlFor} className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-600">{children}</label>;
export const Input = (p) => <input {...p} className={`${inputCls} ${p.className ?? ""}`} />;
export const Select = ({ options, ...p }) => (
  <select {...p} className={`${inputCls} ${p.className ?? ""}`}>
    {options.map((o) => (
      <option key={String(o.value)} value={o.value}>{o.label}</option>
    ))}
  </select>
);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A form described by a field list. Field: { name, label, type, options?, required?, hint?, nullable?, min?, max?, step? }
 * Types: text, textarea, number, select, checkbox, date, time, datetime (Pakistan time), days (1-7 checkboxes), multi (checkbox list).
 * Blank optional fields are left out (or sent as null when nullable). Numbers are sent as numbers.
 */
export function FormModal({ title, fields, initial = {}, submitLabel = "Save", onSubmit, onClose, note }) {
  const [v, setV] = useState(() => {
    const o = {};
    for (const f of fields) o[f.name] = initial[f.name] ?? (f.type === "checkbox" ? false : f.type === "days" || f.type === "multi" ? [] : "");
    return o;
  });
  const [busy, setBusy] = useState(false);
  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));

  async function submit(e) {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      let x = v[f.name];
      if (f.readOnly) continue;
      if (f.type === "checkbox") out[f.name] = Boolean(x);
      else if (f.type === "days" || f.type === "multi") out[f.name] = x;
      else if (x === "" || x === null || x === undefined) {
        if (f.nullable) out[f.name] = null;
      } else if (f.type === "number") out[f.name] = Number(x);
      else if (f.type === "datetime") out[f.name] = pkLocalToIso(x);
      else if (f.type === "select" && f.numeric) out[f.name] = Number(x);
      else out[f.name] = typeof x === "string" ? x.trim() : x;
    }
    setBusy(true);
    const ok = await onSubmit(out);
    setBusy(false);
    if (ok !== false) onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        {note && <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-800">{note}</p>}
        {fields.map((f) => {
          const id = `f-${f.name}`;
          const common = { id, disabled: f.readOnly, required: f.required };
          let input;
          if (f.type === "textarea") input = <textarea {...common} rows={f.rows ?? 3} className={inputCls} value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} />;
          else if (f.type === "select")
            input = <Select {...common} value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} options={[{ value: "", label: f.required ? "— choose —" : "—" }, ...f.options]} />;
          else if (f.type === "checkbox")
            input = (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" id={id} disabled={f.readOnly} checked={Boolean(v[f.name])} onChange={(e) => set(f.name, e.target.checked)} className="h-5 w-5 accent-black" />
                {f.checkLabel ?? "Yes"}
              </label>
            );
          else if (f.type === "days" || f.type === "multi") {
            const opts = f.type === "days" ? DAYS.map((d, i) => ({ value: i + 1, label: d })) : f.options;
            input = (
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const on = v[f.name].includes(o.value);
                  return (
                    <button
                      type="button"
                      key={o.value}
                      onClick={() => set(f.name, on ? v[f.name].filter((x) => x !== o.value) : [...v[f.name], o.value])}
                      className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${on ? "border-black bg-black text-white" : "border-neutral-400 bg-white text-neutral-700"}`}
                      aria-pressed={on}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            );
          } else {
            const type = { number: "number", date: "date", time: "time", datetime: "datetime-local" }[f.type] ?? "text";
            input = <Input {...common} type={type} min={f.min} max={f.max} step={f.step ?? (f.type === "number" ? "any" : undefined)} placeholder={f.placeholder} value={v[f.name]} onChange={(e) => set(f.name, e.target.value)} />;
          }
          return (
            <div key={f.name}>
              {f.type !== "checkbox" || f.label ? <Label htmlFor={id}>{f.label}{f.required ? " *" : ""}</Label> : null}
              {input}
              {f.hint && <p className="mt-1 text-xs text-mute">{f.hint}</p>}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2 pt-1">
          <Btn kind="primary" type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </form>
    </Modal>
  );
}

/** Opens a FormModal from a button; `form` is null or the FormModal props. */
export function useForm() {
  const [form, setForm] = useState(null);
  const node = form && <FormModal {...form} onClose={() => setForm(null)} />;
  return [setForm, node];
}

/** Small filter row wrapper. */
export const Filters = ({ children }) => <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
