import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { toast, toastOnce } from "../components/Toast";
import { busTypes, company, getTerminal } from "../data/site";
import { arrow } from "../lib/links";
import { cancelBooking, getBooking, IS_LIVE, resendConfirmation } from "./api";
import { bookUrl, useNow } from "./hooks";
import { bt } from "./strings";
import { fmtDate, fmtDateTime, fmtTime, hms, pkr } from "./time";

const badge = {
  HELD: "bg-amber-100 text-amber-900 border-amber-500",
  CONFIRMED: "bg-green-100 text-green-900 border-green-600",
  EXPIRED: "bg-neutral-200 text-neutral-800 border-neutral-500",
  CANCELLED: "bg-red-100 text-red-900 border-red-500",
};
const star = IS_LIVE ? "" : "*";

export function Countdown({ expiresAt, lang, onZero }) {
  const now = useNow(1000);
  const left = now === null ? null : Date.parse(expiresAt) - now;
  const fired = useRef(false);
  useEffect(() => {
    if (left !== null && left <= 0 && !fired.current) {
      fired.current = true;
      onZero();
    }
  }, [left, onZero]);
  return (
    <div role="timer" aria-label={bt("timeLeft", lang)} className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-mute">{bt("timeLeft", lang)}</p>
      <p className="ltr text-5xl font-bold tabular-nums text-black sm:text-6xl">{left === null ? "--:--:--" : hms(left)}</p>
    </div>
  );
}

/**
 * One booking, in whatever state it is in. `bookingRef` is the mock reference (NK-XXXXXX) or, in live mode,
 * the backend booking id. `initial` skips the first load (manage-booking lookups pass the result in).
 */
export function BookingView({ lang, bookingRef, initial, paymentFailed = false, paymentReview = false }) {
  const [b, setB] = useState(initial ?? null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const dlg = useRef(null);

  const refresh = useCallback(async () => {
    if (initial?.readOnly) return; // public lookups cannot be reloaded without signing in
    try {
      setB(await getBooking(bookingRef));
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, [bookingRef, initial]);
  useEffect(() => {
    if (!initial) refresh();
  }, [initial, refresh]);

  // Toasts for what just happened to this booking: paid, payment failed, needs review, hold expired.
  const { pathname } = useLocation();
  const prevStatus = useRef(null);
  useEffect(() => {
    if (!b || b.readOnly) return;
    const was = prevStatus.current;
    prevStatus.current = b.status;
    if (b.status === "CONFIRMED" && (pathname.endsWith("/book/confirmed") || was === "HELD")) {
      toastOnce(`confirmed-${b.ref}`, bt("toastConfirmed", lang), { body: bt("toastConfirmedBody", lang, { ref: b.ref }) });
    } else if (b.status === "HELD" && paymentFailed && was === null) {
      toast(bt("toastPayFailed", lang), { body: bt("toastPayFailedBody", lang), kind: "error" });
    } else if (paymentReview && b.status !== "CONFIRMED" && was === null) {
      toastOnce(`review-${b.ref}`, bt("toastPayReview", lang), { body: bt("paymentReview", lang), kind: "error" });
    } else if (b.status === "EXPIRED" && was === "HELD") {
      toast(bt("toastExpired", lang), { body: bt("toastExpiredBody", lang, { ref: b.ref }), kind: "info" });
    }
  }, [b, pathname, paymentFailed, paymentReview, lang]);

  if (err)
    return (
      <div role="alert" className="card mt-6">
        <p className="font-semibold text-red-800">{bt("notFound", lang)}</p>
        <p className="mt-1 text-sm text-mute">{err}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={refresh} className="btn btn-ghost">{bt("retry", lang)}</button>
          <Link to={`/${lang}/book/manage`} className="btn btn-gold">{bt("manageLink", lang)}</Link>
        </div>
      </div>
    );
  if (!b) return <p role="status" className="mt-6 text-mute">{bt("loading", lang)}</p>;

  const key = b.id ?? b.ref; // what the API calls use (backend id in live mode)
  const route = b.legs.map((l) => `${l.trip.fromName[lang]} ${arrow(lang)} ${l.trip.toName[lang]}`).join(" · ");

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(b.ref);
    } catch {
      const t = document.createElement("textarea");
      t.value = b.ref;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    toast(bt("toastCopied", lang), { body: b.ref, kind: "info", duration: 2500 });
    setTimeout(() => setCopied(false), 2000);
  }

  async function act(kind) {
    setBusy(kind);
    setMsg("");
    try {
      if (kind === "resend") {
        setB(await resendConfirmation(key));
        setMsg(bt("resentOk", lang));
      } else {
        const next = await cancelBooking(key);
        setB(next);
        dlg.current?.close();
        toast(bt("toastCancelled", lang), { body: bt("toastCancelledBody", lang, { ref: b.ref }) });
      }
    } catch (e) {
      setMsg(e.message || bt("actionFailed", lang));
      toast(bt("toastActionFailed", lang), { body: e.message || bt("actionFailed", lang), kind: "error" });
    }
    setBusy("");
  }

  return (
    <div className="mt-6">
      {paymentReview && b.status !== "CONFIRMED" && <p role="alert" className="mb-4 rounded-xl border border-red-500 bg-red-50 p-4 font-semibold text-red-900">{bt("paymentReview", lang)}</p>}
      {paymentFailed && b.status === "HELD" && <p role="alert" className="mb-4 rounded-xl border border-amber-500 bg-amber-50 p-4 font-semibold text-amber-900">{bt("paymentFailed", lang)}</p>}

      <section className="card !p-5 sm:!p-6" aria-labelledby={`bk-ref-${b.ref}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">{bt("reference", lang)}</p>
            <p id={`bk-ref-${b.ref}`} className="ltr font-mono text-3xl font-bold tracking-wider text-black sm:text-4xl">{b.ref}</p>
            {b.holderCnicMasked && (
              <p className="mt-1 text-sm text-mute">
                {bt("holderCnicShort", lang)}: <span className="ltr font-mono text-black">{b.holderCnicMasked}</span>
              </p>
            )}
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-bold ${badge[b.status]}`}>{bt(`status${b.status}`, lang)}</span>
        </div>

        {b.readOnly && b.status === "HELD" && <p className="mt-4 rounded-xl border border-line bg-coal p-3 text-sm text-black">{bt("signInToManage", lang)}</p>}

        {b.status === "HELD" && !b.readOnly && (
          <div className="no-print mt-6 rounded-2xl border-2 border-gold bg-coal p-5">
            <h2 className="h3 text-center text-black">{bt(IS_LIVE ? "holdTitleLive" : "holdTitle", lang)}</h2>
            {b.holdExpiresAt && (
              <>
                <div className="mt-3"><Countdown expiresAt={b.holdExpiresAt} lang={lang} onZero={refresh} /></div>
                <p className="mt-3 text-center text-sm text-mute">
                  {bt("holdBy", lang)} <strong className="ltr text-black">{fmtDateTime(b.holdExpiresAt, lang)}</strong> {bt("holdByEnd", lang)}
                </p>
              </>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to={bookUrl(lang, "pay", { ref: key })} className="btn btn-gold btn-shine text-lg">{bt("payNow", lang)} · {pkr(b.total)}</Link>
              <button type="button" onClick={copyRef} className="btn btn-ghost">{copied ? `✓ ${bt("copied", lang)}` : bt("copyRef", lang)}</button>
            </div>
          </div>
        )}

        {b.status === "CONFIRMED" && (
          <div className="mt-6 text-center">
            <div className="tick-wrap mx-auto h-24 w-24">
              <svg viewBox="0 0 56 56" fill="none" aria-hidden className="h-full w-full">
                <circle className="tick-circle" cx="28" cy="28" r="26" stroke="#15803d" strokeWidth="3" />
                <path className="tick-check" d="M16 29l8 8 16-17" stroke="#15803d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="h2 mt-3 text-black">{bt("confirmedTitle", lang)}</h2>
            <p className="mt-1 text-mute">{bt("confirmedBody", lang)}</p>
            <div className="no-print mt-5 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => window.print()} className="btn btn-gold btn-shine">{bt("printTicket", lang)}</button>
              <button type="button" onClick={copyRef} className="btn btn-ghost">{copied ? `✓ ${bt("copied", lang)}` : bt("copyRef", lang)}</button>
            </div>
          </div>
        )}

        {b.status === "EXPIRED" && (
          <div role="status" className="mt-6 rounded-2xl border-2 border-neutral-400 bg-neutral-100 p-5 text-center">
            <h2 className="h3 text-black">{bt("expiredTitle", lang)}</h2>
            {/* Paid after the hold ran out: the money arrived but the seats were already released, so it is refunded. */}
            <p className="mt-1 text-mute">{b.payment || b.paymentReceived ? bt("paymentReview", lang) : bt(IS_LIVE ? "expiredBodyLive" : "expiredBody", lang)}</p>
            <Link to={`/${lang}/book`} className="btn btn-gold mt-4">{bt("searchAgain", lang)}</Link>
          </div>
        )}

        {b.status === "CANCELLED" && (
          <div role="status" className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-center">
            <h2 className="h3 text-black">{bt("cancelledTitle", lang)}</h2>
            <p className="mt-1 text-mute">{bt("cancelledBody", lang)}</p>
            <Link to={`/${lang}/book`} className="btn btn-gold mt-4">{bt("searchAgain", lang)}</Link>
          </div>
        )}
      </section>

      {/* ---- journey ---- */}
      {b.legs.map((l, i) => {
        const bus = busTypes.find((x) => x.id === l.trip.busType) ?? busTypes[0];
        const term = l.trip.boardingTerminal ? { name: { en: l.trip.boardingTerminal, ur: l.trip.boardingTerminal }, address: null } : getTerminal(l.trip.fromId);
        const group = l.group ?? (i === 0 ? 0 : 1);
        const sameGroup = b.legs.filter((x, k) => (x.group ?? (k === 0 ? 0 : 1)) === group);
        const k = sameGroup.indexOf(l) + 1;
        const hasReturn = b.legs.some((x, kk) => (x.group ?? (kk === 0 ? 0 : 1)) === 1);
        const legLabel = [hasReturn ? (group === 0 ? bt("outbound", lang) : bt("returnLeg", lang)) : "", sameGroup.length > 1 ? bt("legOf", lang, { k, n: sameGroup.length }) : ""].filter(Boolean).join(" · ");
        const prev = b.legs[i - 1];
        const layover = prev && (prev.group ?? (i - 1 === 0 ? 0 : 1)) === group && prev.trip.toId === l.trip.fromId ? Math.round((Date.parse(l.trip.departAt) - Date.parse(prev.trip.arriveAt)) / 60000) : null;
        const hmm = (m) => (lang === "ur" ? `${Math.floor(m / 60)} گھنٹے${m % 60 ? ` ${m % 60} منٹ` : ""}` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`);
        return (
          <div key={`${l.tripId}-${i}`}>
            {layover !== null && (
              <div role="note" className="mt-4 rounded-xl border border-gold/60 bg-gold/10 px-4 py-3 text-center text-sm">
                <p className="font-semibold text-black">⏱ {bt("layoverBadge", lang, { city: l.trip.fromName[lang], time: hmm(layover) })}</p>
                <p className="text-mute">{bt("layoverTip", lang)}</p>
              </div>
            )}
            <section className="card mt-4">
              <h2 className="h3 text-black">
                {legLabel && <span className="me-2 rounded bg-black px-2 py-0.5 text-xs text-gold-bright">{legLabel}</span>}
                {l.trip.fromName[lang]} {arrow(lang)} {l.trip.toName[lang]}
              </h2>
              <p className="mt-1 text-sm text-mute">
                {fmtDate(l.trip.departAt, lang)} ·{" "}
                {lang === "ur" ? (
                  <span>{fmtTime(l.trip.departAt, lang)} {arrow(lang)} {fmtTime(l.trip.arriveAt, lang)}</span>
                ) : (
                  <span className="ltr">{fmtTime(l.trip.departAt, lang)} → {fmtTime(l.trip.arriveAt, lang)} PKT</span>
                )}{" "}
                · {bus.name[lang]}
              </p>
              <p className="mt-1 text-sm text-mute">{bt("boardingAt", lang)}: {term.name[lang]}{term.address ? `, ${term.address[lang]}` : ""}</p>
              <h3 className="mt-4 text-sm font-semibold text-black">{bt("passengersHeading", lang)}</h3>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {b.passengers.map((p, k2) => (
                  <li key={k2} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="font-semibold text-black">{p.name}</span>
                    <span className="rounded bg-gold/30 px-2 py-0.5 font-bold text-black">{bt("seatWord", lang, { id: l.seats[k2] })}</span>
                  </li>
                ))}
              </ul>
              {l.trip.fare > 0 && (
                <p className="ltr mt-3 text-end text-sm text-mute">{pkr(l.trip.fare)}{star} × {b.passengers.length} = <strong className="text-black">{pkr(l.fare)}{star}</strong></p>
              )}
            </section>
          </div>
        );
      })}

      <section className="card mt-4">
        <p className="flex items-center justify-between text-lg">
          <span className="font-semibold text-black">{b.status === "CONFIRMED" ? bt("farePaid", lang) : bt("fareTotal", lang)}</span>
          <strong className="ltr text-2xl text-black">{pkr(b.payment?.amount ?? b.total)}{star}</strong>
        </p>
        {b.payment && <p className="mt-1 text-sm text-mute">{bt("paidVia", lang, { method: bt(b.payment.method, lang), txn: b.payment.txnId })}</p>}
        {!IS_LIVE && <p className="mt-2 text-xs text-mute">{bt("placeholderNote", lang)}</p>}
      </section>

      {/* ---- email panel (demo preview only) ---- */}
      {b.status === "CONFIRMED" && !IS_LIVE && (
        <section className="no-print card mt-4">
          <h2 className="h3 text-black">✉ {bt("emailSentTo", lang, { email: b.contactEmail })}</h2>
          <p className="mt-1 text-xs text-mute">{bt("emailPreview", lang)}</p>
          <div className="mt-3 rounded-xl border border-line bg-white p-4 text-sm" dir="ltr">
            <p><strong>From:</strong> New Khan &lt;{company.email}&gt;</p>
            <p><strong>To:</strong> {b.contactEmail}</p>
            <p><strong>Subject:</strong> Your New Khan ticket {b.ref} is confirmed</p>
            <hr className="my-3 border-line" />
            <p>Assalam o Alaikum {b.passengers[0].name},</p>
            <p className="mt-2">Your booking <strong>{b.ref}</strong> is confirmed.</p>
            <ul className="mt-2 list-disc ps-5">
              {b.legs.map((l, i) => (
                <li key={i}>{l.trip.fromName.en} to {l.trip.toName.en}, {fmtDate(l.trip.departAt, "en")} {fmtTime(l.trip.departAt, "en")} PKT, seats {l.seats.join(", ")}</li>
              ))}
            </ul>
            <p className="mt-2">Fare paid: {pkr(b.payment?.amount ?? b.total)}. Show your reference at the counter.</p>
            <p className="mt-2">Helpline {company.helpline} · {company.email}</p>
          </div>
          <button type="button" onClick={() => act("resend")} disabled={busy === "resend"} className="btn btn-ghost mt-3">{busy === "resend" ? bt("processing", lang) : bt("resend", lang)}</button>
        </section>
      )}

      {msg && <p role="status" className="mt-4 rounded-xl border border-line bg-coal p-3 text-sm text-black">{msg}</p>}

      {b.canCancel && (b.status === "HELD" || b.status === "CONFIRMED") && (
        <div className="no-print mt-6 text-center">
          <button type="button" onClick={() => dlg.current?.showModal()} className="text-sm font-semibold text-red-800 underline underline-offset-4">{bt("cancelBooking", lang)}</button>
        </div>
      )}

      {/* Cancel confirmation: names the booking. Native <dialog> gives focus trapping and Escape for free. */}
      <dialog ref={dlg} className="m-auto w-[min(92vw,28rem)] rounded-2xl border-2 border-black p-6 backdrop:bg-black/60" dir={lang === "ur" ? "rtl" : "ltr"}>
        <h2 className="h3 text-black">{bt("cancelTitle", lang, { ref: b.ref })}</h2>
        <p className="mt-2 text-mute">{bt("cancelBody", lang, { route })}</p>
        {b.status === "CONFIRMED" && <p className="mt-2 text-sm text-mute">{bt("cancelRefund", lang)}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" autoFocus onClick={() => dlg.current?.close()} className="btn btn-gold">{bt("keepBooking", lang)}</button>
          <button type="button" onClick={() => act("cancel")} disabled={busy === "cancel"} className="btn border border-red-700 text-red-800 hover:bg-red-50">
            {busy === "cancel" ? bt("processing", lang) : bt("yesCancel", lang, { ref: b.ref })}
          </button>
        </div>
      </dialog>
    </div>
  );
}

/** Renders the booking(s) in ?ref= (comma-separated: a live return trip is two bookings). */
export function BookingByParam({ lang }) {
  const [sp] = useSearchParams();
  const refs = (sp.get("ref") ?? "").split(",").filter(Boolean);
  if (!refs.length)
    return (
      <div className="card mt-6">
        <p>{bt("notFound", lang)}</p>
        <Link to={`/${lang}/book/manage`} className="btn btn-gold mt-4">{bt("manageLink", lang)}</Link>
      </div>
    );
  return refs.map((r) => (
    <BookingView key={r} lang={lang} bookingRef={r} paymentFailed={sp.get("payment") === "failed"} paymentReview={sp.get("payment") === "review"} />
  ));
}
