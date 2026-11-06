/**
 * Website content: the text visitors read (contact details, terminals page, destinations with fares and times,
 * FAQ, About page items, policies). Each section is edited in a form built from its data; English and Urdu sit
 * side by side. Saved sections replace the built-in text for every visitor (the site loads them at start-up);
 * "Reset to built-in" removes the saved version.
 */
import { useMemo, useState } from "react";
import { legalBuiltIn } from "../../data/legal";
import { siteBuiltIn } from "../../data/site";
import { adminApi } from "../api";
import { act, Badge, Btn, ErrorNote, fmtDT, Page, useConfirm, useLoad } from "../ui";

const SECTIONS = [
  { key: "company", title: "Contact details", about: "Helpline, WhatsApp, email, head office address and hours, social links. Used in the header, footer, buttons and policies.", builtIn: siteBuiltIn.company },
  { key: "terminals", title: "Terminals page", about: "The terminal cards visitors see: name, address, phone, hours, map search. (Booking terminals are under Cities & terminals.)", builtIn: siteBuiltIn.terminals },
  { key: "destinations", title: "Destinations from Lahore", about: "Towns, distances, journey time, fares and departure times shown on the home page, Fleet & Routes and route pages. Booking prices come from Fares, so keep them the same.", builtIn: siteBuiltIn.destinations },
  { key: "multanLinks", title: "Multan route towns", about: "Towns on the Multan route, with fares and times, shown on the route map and route pages.", builtIn: siteBuiltIn.multanLinks },
  { key: "busTypes", title: "Coach classes", about: "Coach class name, photo, description and features on the Fleet page and booking screens.", builtIn: siteBuiltIn.busTypes },
  { key: "promises", title: "Our promises", about: "The promises under the home page banner and on the About page.", builtIn: siteBuiltIn.promises },
  { key: "faq", title: "Home page questions", about: "The 'Before you book' questions and answers.", builtIn: siteBuiltIn.faq },
  { key: "heritage", title: "Our journey", about: "Years and milestones on the About and home pages.", builtIn: siteBuiltIn.heritage },
  { key: "team", title: "Team", about: "Team cards on the About page.", builtIn: siteBuiltIn.team },
  { key: "cargoNote", title: "Cargo & charter note", about: "The closing line on the Cargo and Charter pages.", builtIn: siteBuiltIn.cargoNote },
  { key: "legal", title: "Policies", about: "Refund and cancellation, service delivery, travel rules, privacy and terms. Change 'Last updated' when you edit them.", builtIn: legalBuiltIn },
];

/* ------------------------------------------------------------------ generic editor */

const LABELS = {
  en: "English", ur: "Urdu", name: "Name", title: "Title", body: "Text", summary: "Summary", h: "Heading", p: "Paragraphs", list: "Bullet points",
  q: "Question", a: "Answer", id: "ID (used in page addresses and photo names; lowercase-with-hyphens)", image: "Photo (path under /images, or https:// link)",
  helpline: "Helpline, as shown", helplineTel: "Helpline for dialling (+92…)", whatsapp: "WhatsApp number (digits only, 92…)", email: "Email",
  bookmeUrl: "Bookme link", address: "Address", addressUr: "Address in Urdu", street: "Street", city: "City", region: "Province", country: "Country",
  helplineHours: "Helpline hours", social: "Social links", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", founded: "Founded (year)",
  acSince: "AC coaches since (year)", fleet: "Fleet size", ac: "AC", distanceKm: "Distance (km)", hours: "Journey time (hours)", via: "Route via",
  fares: "Fares (Rs)", fromLahore: "Departures from Lahore (HH:MM, comma-separated)", toLahore: "Departures to Lahore (HH:MM, comma-separated)",
  minor: "Small stop (shown smaller)", phone: "Phone", mapQuery: "Google Maps search text", addressConfirmed: "Address confirmed (hides 'to be confirmed')",
  blurb: "Description", features: "Features", year: "Year", text: "Text", updated: "Last updated (shown on policy pages)", docs: "Policy documents",
  sections: "Sections", kind: "Kind",
};
const humanize = (k) => LABELS[k] ?? String(k).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const isBilingual = (v) => v && typeof v === "object" && !Array.isArray(v) && "en" in v && "ur" in v && Object.keys(v).length === 2;
const isPrimitive = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
/** A short title for a list item. */
const itemTitle = (it, i) => {
  if (isPrimitive(it)) return String(it);
  const pick = (x) => (x && typeof x === "object" ? x.en : x);
  return pick(it.name) || pick(it.title) || pick(it.q) || pick(it.h) || it.year || pick(it.city) || it.id || `Item ${i + 1}`;
};
/** An empty item shaped like `like`, for "+ Add". */
const blankLike = (like) => {
  if (Array.isArray(like)) return [];
  if (like && typeof like === "object") return Object.fromEntries(Object.entries(like).map(([k, v]) => [k, blankLike(v)]));
  if (typeof like === "number") return 0;
  if (typeof like === "boolean") return false;
  return "";
};

const inCls = "w-full rounded-lg border-2 border-neutral-400 bg-white px-2 py-1.5 text-sm text-black focus:border-black";

function TextBox({ value, onChange, rtl, label }) {
  const long = String(value ?? "").length > 70;
  const p = { "aria-label": label, value: value ?? "", onChange: (e) => onChange(e.target.value), dir: rtl ? "rtl" : undefined, lang: rtl ? "ur" : undefined, className: inCls };
  return long ? <textarea rows={Math.min(8, Math.ceil(String(value).length / 70) + 1)} {...p} /> : <input {...p} />;
}

function ValueEditor({ value, onChange, name, depth = 0 }) {
  const label = humanize(name);

  if (isBilingual(value))
    return (
      <div>
        <p className="mb-1 text-xs font-bold text-neutral-600">{label}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <TextBox label={`${label} (English)`} value={value.en} onChange={(x) => onChange({ ...value, en: x })} />
          <TextBox label={`${label} (Urdu)`} rtl value={value.ur} onChange={(x) => onChange({ ...value, ur: x })} />
        </div>
      </div>
    );

  if (typeof value === "boolean")
    return (
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-black" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
    );

  if (typeof value === "number")
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span>
        <input type="number" step="any" className={`${inCls} max-w-40`} value={value} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      </label>
    );

  if (isPrimitive(value))
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span>
        <TextBox label={label} value={value ?? ""} onChange={onChange} />
      </label>
    );

  // list of plain values (e.g. departure times): one comma-separated box
  const PLAIN_LISTS = ["fromLahore", "toLahore"];
  if (Array.isArray(value) && (value.length ? value.every((x) => typeof x === "string" || typeof x === "number") : PLAIN_LISTS.includes(name))) {
    const numeric = value.length > 0 && value.every((x) => typeof x === "number");
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span>
        <input
          className={inCls}
          defaultValue={value.join(", ")}
          onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (numeric ? Number(s) : s)))}
        />
      </label>
    );
  }

  if (Array.isArray(value)) return <ListEditor value={value} onChange={onChange} name={name} depth={depth} />;

  // object: one editor per field
  return (
    <fieldset className={depth ? "grid gap-3 rounded-xl border border-neutral-300 p-3" : "grid gap-3"}>
      {depth > 0 && <legend className="px-1 text-xs font-bold uppercase tracking-wide text-neutral-600">{label}</legend>}
      {Object.entries(value).map(([k, v]) => (
        <ValueEditor key={k} name={k} value={v} depth={depth + 1} onChange={(x) => onChange({ ...value, [k]: x })} />
      ))}
    </fieldset>
  );
}

function ListEditor({ value, onChange, name, depth }) {
  const [openIdx, setOpenIdx] = useState(null);
  const set = (i, x) => onChange(value.map((v, j) => (j === i ? x : v)));
  const move = (i, d) => {
    const b = [...value];
    [b[i], b[i + d]] = [b[i + d], b[i]];
    onChange(b);
    setOpenIdx(i + d);
  };
  const template = value[0] ?? { en: "", ur: "" }; // empty lists in this content are lists of English/Urdu texts
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-600">{humanize(name)} ({value.length})</p>
      <div className="grid gap-2">
        {value.map((it, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className="rounded-xl border border-neutral-300 bg-neutral-50">
              <div className="flex items-center gap-2 p-2">
                <button type="button" onClick={() => setOpenIdx(open ? null : i)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-black" aria-expanded={open}>
                  {open ? "▾" : "▸"} {itemTitle(it, i)}
                </button>
                <Btn small disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</Btn>
                <Btn small disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</Btn>
                <Btn small kind="danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">✕</Btn>
              </div>
              {open && (
                <div className="border-t border-neutral-300 bg-white p-3">
                  <ValueEditor value={it} name={name} depth={depth + 1} onChange={(x) => set(i, x)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Btn small className="mt-2" onClick={() => { onChange([...value, blankLike(template)]); setOpenIdx(value.length); }}>+ Add</Btn>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function Content() {
  const saved = useLoad(() => adminApi.content(), []);
  const [key, setKey] = useState(SECTIONS[0].key);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0); // remounts the form after save / discard / reset (comma-separated boxes keep their own text)
  const [ask, confirmNode] = useConfirm();
  const clearDraft = () => {
    setDrafts((d) => ({ ...d, [key]: undefined }));
    setVer((v) => v + 1);
  };

  const savedBy = useMemo(() => Object.fromEntries((saved.data ?? []).map((r) => [r.key, r])), [saved.data]);
  const sec = SECTIONS.find((s) => s.key === key);
  const current = drafts[key] ?? savedBy[key]?.value ?? structuredClone(sec.builtIn);
  const baseline = savedBy[key]?.value ?? sec.builtIn;
  const dirty = drafts[key] !== undefined && JSON.stringify(drafts[key]) !== JSON.stringify(baseline);

  async function save() {
    setBusy(true);
    const ok = await act(() => adminApi.saveContent(key, current), "Saved", "Visitors see it on their next page load (within about a minute).");
    setBusy(false);
    if (ok) {
      clearDraft();
      saved.reload();
    }
  }
  async function reset() {
    if (!(await ask(`Reset "${sec.title}"?`, "The saved version is deleted and the website goes back to the text it was built with."))) return;
    if (await act(() => adminApi.resetContent(key), "Back to built-in text")) {
      clearDraft();
      saved.reload();
    }
  }

  return (
    <Page title="Website content" intro="Change what visitors read without touching code. Fill in English and Urdu. Nothing is published until you press Save.">
      <ErrorNote err={saved.err} onRetry={saved.reload} />
      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Sections" className="grid content-start gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setKey(s.key)}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${key === s.key ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-200"}`}
            >
              {s.title}
              {drafts[s.key] !== undefined ? <Badge tone="amber">unsaved</Badge> : savedBy[s.key] ? <Badge tone="green">edited</Badge> : null}
            </button>
          ))}
        </nav>
        <div className="min-w-0 rounded-2xl border-2 border-black bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{sec.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-mute">{sec.about}</p>
              <p className="mt-1 text-xs text-mute">
                {savedBy[key] ? `Edited ${fmtDT(savedBy[key].updatedAt)}${savedBy[key].updatedByName ? ` by ${savedBy[key].updatedByName}` : ""}.` : "Showing the built-in text (never edited)."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save"}</Btn>
              {dirty && <Btn onClick={clearDraft}>Discard changes</Btn>}
              {savedBy[key] && <Btn kind="danger" onClick={reset}>Reset to built-in</Btn>}
            </div>
          </div>
          <div className="mt-4" key={`${key}-${ver}`}>
            {saved.loading && !saved.data ? (
              <p className="text-sm text-mute">Loading…</p>
            ) : (
              <ValueEditor name={key} value={current} onChange={(v) => setDrafts((d) => ({ ...d, [key]: v }))} />
            )}
          </div>
        </div>
      </div>
      {confirmNode}
    </Page>
  );
}
