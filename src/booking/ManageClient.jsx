import { useState } from "react";
import { PhoneInput } from "../components/PatternFields";
import { company } from "../data/site";
import { lookupBooking, lookupByPhone } from "./api";
import { BookingCard } from "./BookingList";
import { BookingView } from "./BookingView";
import { bt } from "./strings";

// Demo refs look like NK-7H3K9Q; backend PNRs like NK7H3K9Q (with or without the dash is fine).
const refOk = (v) => /^NK-?[A-Z0-9]{6}$/i.test(v.trim());
const phoneOk = (v) => /^(?:\+92|0092|92|0)?3\d{9}$/.test(v.replace(/[\s-]/g, ""));
const cleanPhone = (v) => v.replace(/[\s-]/g, "");

/**
 * Find a booking. The mobile number alone lists every booking made with it (no passenger details);
 * with the booking reference too, that booking opens in full.
 */
export function ManageClient({ lang }) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ ref: false, phone: false });
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const [list, setList] = useState(null); // phone-only results
  const [found, setFound] = useState(null); // one booking, in full

  const eRef = ref.trim() && !refOk(ref) ? bt("errRef", lang) : "";
  const ePhone = !phoneOk(phone) ? bt("errPhone", lang) : "";

  async function open(pnr) {
    setBusy(pnr);
    setProblem("");
    try {
      setFound(await lookupBooking(pnr, cleanPhone(phone)));
      requestAnimationFrame(() => document.getElementById("m-found")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setFound(null);
      setProblem(bt("noMatch", lang));
    }
    setBusy("");
  }

  async function submit(e) {
    e.preventDefault();
    setTouched({ ref: true, phone: true });
    setProblem("");
    setFound(null);
    setList(null);
    if (ePhone || eRef) {
      document.getElementById(ePhone ? "m-phone" : "m-ref")?.focus();
      return;
    }
    if (ref.trim()) return open(ref.trim());
    setBusy("list");
    try {
      const rows = await lookupByPhone(cleanPhone(phone));
      setList(rows);
      if (!rows.length) setProblem(bt("noPhoneMatch", lang));
    } catch (err) {
      setProblem(err.message || bt("noPhoneMatch", lang));
    }
    setBusy("");
  }

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-mute">{bt("manageIntro", lang)}</p>
      <form onSubmit={submit} noValidate className="card mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="m-phone" className="label">{bt("mobileField", lang)}</label>
          <PhoneInput id="m-phone" className="field" lang={lang} value={phone} messages={false} onChange={setPhone} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} aria-invalid={touched.phone && !!ePhone} describedBy={touched.phone && ePhone ? "m-phone-e" : undefined} />
          {touched.phone && ePhone && <p id="m-phone-e" role="alert" className="mt-1 text-sm text-red-700">{ePhone}</p>}
        </div>
        <div>
          <label htmlFor="m-ref" className="label">{bt("refOptional", lang)}</label>
          <input id="m-ref" className="field ltr uppercase" autoComplete="off" placeholder="NK…" value={ref} onChange={(e) => setRef(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, ref: true }))} aria-invalid={touched.ref && !!eRef} aria-describedby={touched.ref && eRef ? "m-ref-e" : undefined} />
          {touched.ref && eRef && <p id="m-ref-e" role="alert" className="mt-1 text-sm text-red-700">{eRef}</p>}
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={!!busy} className="btn btn-gold w-full sm:w-auto">{busy ? bt("finding", lang) : bt("findBooking", lang)}</button>
        </div>
        {problem && (
          <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900 sm:col-span-2">
            {problem} <a href={`tel:${company.helplineTel}`} className="font-semibold underline">{bt("needHelp", lang)}</a>
          </p>
        )}
      </form>

      {list?.length > 0 && (
        <section className="mt-6" aria-labelledby="m-list">
          <h2 id="m-list" className="h3 text-black">{bt("phoneResults", lang, { n: list.length })}</h2>
          <p className="mt-1 text-sm text-mute">{bt("phoneListNote", lang)}</p>
          <ul className="mt-4 grid gap-4">
            {list.map((b) => (
              <BookingCard
                key={b.ref}
                b={b}
                lang={lang}
                action={
                  <button type="button" onClick={() => open(b.ref)} disabled={!!busy} className="btn btn-ghost !min-h-11 !py-2 text-sm">
                    {busy === b.ref ? bt("finding", lang) : bt("openBooking", lang)}
                  </button>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {found && (
        <div id="m-found" className="scroll-mt-24">
          <div className="mt-6 -mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setFound(null);
                if (list?.length) requestAnimationFrame(() => document.getElementById("m-list")?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
              aria-label={lang === "ur" ? "بکنگ بند کریں" : "Close booking"}
              title={lang === "ur" ? "بند کریں" : "Close"}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-black hover:bg-neutral-100"
            >
              <svg aria-hidden viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <BookingView key={found.ref} lang={lang} bookingRef={found.id ?? found.ref} initial={found} />
        </div>
      )}
    </div>
  );
}
