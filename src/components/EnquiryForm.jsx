import { useState } from "react";
import { toast } from "./Toast";
import { company, getTerminal } from "../data/site";
import { ui } from "../lib/i18n";
import { whatsappLink } from "../lib/links";

const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRef = () => "CG-" + Array.from({ length: 6 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join("");

/** Web3Forms access key (public by design). Without one, the enquiry is handed to WhatsApp instead. */
const W3_KEY = import.meta.env.VITE_WEB3FORMS_KEY;

const kindTitle = {
  charter: { en: "Charter enquiry", ur: "بس کرائے پر لینے کی درخواست" },
  cargo: { en: "Parcel / cargo request", ur: "پارسل / کارگو کی درخواست" },
  contact: { en: "Message", ur: "پیغام" },
};

const handoff = {
  en: "WhatsApp has opened with your details filled in. Press send there and we will reply on the same chat.",
  ur: "واٹس ایپ آپ کی تفصیل کے ساتھ کھل گیا ہے۔ وہاں بھیجیں کا بٹن دبائیں، ہم اسی چیٹ پر جواب دیں گے۔",
};
const reopen = { en: "Open WhatsApp again", ur: "واٹس ایپ دوبارہ کھولیں" };
const printReceipt = { en: "Print parcel receipt", ur: "پارسل کی رسید پرنٹ کریں" };

/** Terminal ids become town names; everything else is shown as typed. */
const shown = (f, v, lang) => (f.type === "select" && v ? getTerminal(v).city[lang] : v);

/** The enquiry as a WhatsApp message: a title line, the consignment number for parcels, then one line per filled field. */
function waText(kind, lang, fields, values, ref) {
  const lines = [`New Khan: ${kindTitle[kind][lang]}`];
  if (ref) lines.push(`${ui.cargoRef[lang]}: ${ref}`);
  for (const f of fields) {
    const v = values[f.name];
    if (v && !(f.type === "checkbox" && v === "No")) lines.push(`${f.label}: ${shown(f, v, lang)}`);
  }
  return `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Parcel receipt in its own window, sized for A4, then the browser's print dialog (works in Urdu too). */
function openReceipt(lang, fields, done) {
  const w = window.open("", "_blank");
  if (!w) return window.print();
  const rows = fields
    .filter((f) => done.values[f.name])
    .map((f) => `<tr><th>${esc(f.label)}</th><td>${esc(shown(f, done.values[f.name], lang))}${f.name === "weight" ? " kg" : ""}</td></tr>`)
    .join("");
  const at = new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }).format(new Date(done.at));
  w.document.write(`<!doctype html><html lang="${lang}" dir="${lang === "ur" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(done.ref)}</title>
<style>
body{font:15px/1.5 "DM Sans","Noto Naskh Arabic",system-ui,sans-serif;color:#111;margin:32px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #111;padding-bottom:14px}
h1{font-size:26px;margin:0}.ref{font:700 26px/1 ui-monospace,monospace;color:#7a1f1f;letter-spacing:.05em}
small{color:#5f5f5f;text-transform:uppercase;letter-spacing:.12em;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:18px}th,td{text-align:start;padding:8px 10px;border-bottom:1px solid #ccc;vertical-align:top}th{width:38%;color:#444;font-weight:600}
p{color:#444;font-size:13px;margin-top:22px}
</style></head><body>
<header><div><h1>New Khan</h1><div>${esc(lang === "ur" ? "پارسل کی رسید" : "Parcel receipt")}</div><div>${esc(at)}</div></div>
<div><small>${esc(ui.cargoRef[lang])}</small><div class="ref">${esc(done.ref)}</div></div></header>
<table>${rows}</table>
<p>${esc(lang === "ur" ? `یہ آپ کی درخواست کی رسید ہے۔ سامان ٹرمینل پر دوبارہ تولا جائے گا اور ریٹ کی تصدیق کی جائے گی۔ ہیلپ لائن ${company.helpline}` : `This is a receipt for your request. Your parcel is re-weighed at the terminal and the rate confirmed there. Helpline ${company.helpline}`)}</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
  w.document.close();
}

/** Charter, cargo and contact enquiry form. */
export function EnquiryForm({ lang, kind, fields }) {
  const [state, setState] = useState("idle"); // idle | sending | sent | failed
  const [done, setDone] = useState(null); // { ref, values, at, wa }

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = {};
    for (const f of fields) values[f.name] = f.type === "checkbox" ? (fd.get(f.name) ? "Yes" : "No") : String(fd.get(f.name) ?? "").trim();
    // Parcels get a consignment number up front, so the sender can quote it and it appears on the receipt.
    const ref = kind === "cargo" ? newRef() : undefined;
    const at = new Date().toISOString();

    if (!W3_KEY) {
      const wa = waText(kind, lang, fields, values, ref);
      window.open(wa, "_blank", "noopener");
      setDone({ ref, values, at, wa });
      setState("sent");
      return;
    }

    setState("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: W3_KEY,
          subject: `New Khan ${kind} enquiry${ref ? ` ${ref}` : ""}`,
          from_name: "New Khan website",
          botcheck: String(fd.get("website") ?? ""),
          language: lang,
          reference: ref ?? "",
          ...values,
        }),
      });
      if (!res.ok) {
        toast(ui.sendFailed[lang], { kind: "error" });
        return setState("failed");
      }
      setDone({ ref, values, at });
      setState("sent");
      toast(ref ? `${ui.cargoRef[lang]}: ${ref}` : lang === "ur" ? "درخواست بھیج دی گئی" : "Enquiry sent", { body: ref ? ui.cargoSent[lang] : ui.sent[lang] });
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="card border-gold/60">
        {done?.ref ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-mute">{ui.cargoRef[lang]}</p>
            <p className="ltr font-mono text-4xl font-bold tracking-wider text-[#7a1f1f]">{done.ref}</p>
            <p className="mt-3">{ui.cargoSent[lang]}</p>
            <dl className="mt-4 grid gap-2 rounded-xl bg-coal p-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-mute">{ui.item[lang]}</dt>
                <dd className="font-semibold text-black">{done.values.item}</dd>
              </div>
              <div>
                <dt className="text-mute">{ui.weight[lang]}</dt>
                <dd className="ltr font-semibold text-black">{done.values.weight} kg</dd>
              </div>
              <div>
                <dt className="text-mute">{ui.pieces[lang]}</dt>
                <dd className="ltr font-semibold text-black">{done.values.pieces}</dd>
              </div>
            </dl>
          </>
        ) : (
          !done?.wa && <p className="text-lg">{ui.sent[lang]}</p>
        )}
        {done?.wa && <p className={done.ref ? "mt-4 text-sm text-mute" : "text-lg"}>{handoff[lang]}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          {done?.ref && (
            <button type="button" onClick={() => openReceipt(lang, fields, done)} className="btn btn-gold btn-shine">
              {printReceipt[lang]}
            </button>
          )}
          {done?.wa && (
            <a href={done.wa} target="_blank" rel="noopener" className="btn btn-ghost">
              {reopen[lang]}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card relative grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `f-${kind}-${f.name}`;
        const hintId = f.hint ? `${id}-hint` : undefined;
        if (f.type === "checkbox") {
          return (
            <label key={f.name} htmlFor={id} className="flex min-h-12 items-center gap-3 sm:col-span-2">
              <input id={id} name={f.name} type="checkbox" className="h-5 w-5 accent-[var(--color-gold)]" />
              <span>{f.label}</span>
            </label>
          );
        }
        return (
          <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label htmlFor={id} className="label">
              {f.label}
              {f.required && <span className="text-gold"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} rows={f.name === "item" ? 3 : 4} required={f.required} minLength={f.minLength} maxLength={2000} aria-describedby={hintId} className="field" />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} required={f.required} defaultValue="" className="field">
                <option value="">{ui.chooseTerminal[lang]}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type}
                required={f.required}
                maxLength={200}
                min={f.min}
                step={f.step}
                defaultValue={f.defaultValue}
                aria-describedby={hintId}
                inputMode={f.type === "tel" ? "tel" : f.type === "number" ? "decimal" : undefined}
                autoComplete={f.name === "name" ? "name" : f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                className="field"
              />
            )}
            {f.hint && <p id={hintId} className="mt-1 text-xs text-mute">{f.hint}</p>}
          </div>
        );
      })}
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={state === "sending"} className="btn btn-gold w-full sm:w-auto">
          {state === "sending" ? ui.sending[lang] : ui.send[lang]}
        </button>
        {state === "failed" && (
          <p role="alert" className="mt-3 text-sm text-amber-800">
            {ui.sendFailed[lang]}{" "}
            <a href={whatsappLink(lang)} target="_blank" rel="noopener" className="font-semibold underline">{lang === "ur" ? "واٹس ایپ" : "WhatsApp"}</a>
            {" · "}
            <a href={`tel:${company.helplineTel}`} className="font-semibold underline">
              <span className="ltr">{company.helpline}</span>
            </a>
          </p>
        )}
      </div>
    </form>
  );
}
