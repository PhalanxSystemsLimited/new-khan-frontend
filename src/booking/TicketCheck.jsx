/**
 * /t/:token: the page a ticket's QR code opens. Always fetched fresh, so a ticket cancelled after it was printed
 * shows as cancelled. Anyone sees whether it is valid, the journey and the seats; New Khan staff who are signed
 * in also see the contact, payment and boarding details (the server decides what to send). Read only.
 * English or Urdu: the language chosen on the website (remembered on this device), with a switch.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IS_LIVE } from "./api";
import { useSession } from "./auth";
import { apiRequest } from "./live/liveApi";
import { fmtDate, fmtDateTime, fmtTime, pkr } from "./time";

const LANG_KEY = "nk_lang_choice"; // same key as the website's language dialog

const T = {
  title: { en: "Ticket check", ur: "ٹکٹ کی جانچ" },
  loading: { en: "Checking the ticket…", ur: "ٹکٹ چیک ہو رہا ہے…" },
  notFound: { en: "No ticket found for this QR code", ur: "اس QR کوڈ کا کوئی ٹکٹ نہیں ملا" },
  notFoundBody: { en: "Check that the whole code was scanned, or call the helpline with the ticket number.", ur: "دیکھیں کہ پورا کوڈ اسکین ہوا ہے، یا ٹکٹ نمبر کے ساتھ ہیلپ لائن پر کال کریں۔" },
  error: { en: "The ticket could not be checked", ur: "ٹکٹ چیک نہیں ہو سکا" },
  retry: { en: "Try again", ur: "دوبارہ کوشش کریں" },
  demo: { en: "Ticket checks need the live system.", ur: "ٹکٹ کی جانچ صرف لائیو سسٹم میں ہوتی ہے۔" },
  valid: { en: "Valid ticket", ur: "درست ٹکٹ" },
  completed: { en: "Trip completed", ur: "سفر مکمل ہو چکا" },
  cancelled: { en: "Cancelled", ur: "منسوخ" },
  unpaid: { en: "Not paid", ur: "ادائیگی نہیں ہوئی" },
  expired: { en: "Reservation expired", ur: "ریزرویشن ختم ہو گئی" },
  validBody: { en: "This ticket is paid and confirmed.", ur: "اس ٹکٹ کی ادائیگی ہو چکی ہے اور یہ تصدیق شدہ ہے۔" },
  completedBody: { en: "This trip has already arrived.", ur: "یہ سفر پہلے ہی منزل پر پہنچ چکا ہے۔" },
  cancelledBody: { en: "This ticket is not valid for travel.", ur: "یہ ٹکٹ سفر کے لیے درست نہیں۔" },
  unpaidBody: { en: "The seats are reserved but not paid. Not valid for travel yet.", ur: "سیٹیں ریزرو ہیں مگر ادائیگی نہیں ہوئی۔ ابھی سفر کے لیے درست نہیں۔" },
  expiredBody: { en: "It was not paid in time. Not valid for travel.", ur: "وقت پر ادائیگی نہیں ہوئی۔ سفر کے لیے درست نہیں۔" },
  pnr: { en: "Ticket number", ur: "ٹکٹ نمبر" },
  from: { en: "From", ur: "روانگی" },
  to: { en: "To", ur: "منزل" },
  departs: { en: "Departs", ur: "روانگی کا وقت" },
  seats: { en: "Seats", ur: "سیٹیں" },
  seat: { en: "Seat", ur: "سیٹ" },
  seatCancelled: { en: "cancelled", ur: "منسوخ" },
  staffTitle: { en: "Staff details", ur: "عملے کے لیے تفصیل" },
  contact: { en: "Contact", ur: "رابطہ" },
  cnic: { en: "CNIC", ur: "شناختی کارڈ" },
  bus: { en: "Bus", ur: "بس" },
  paid: { en: "Paid", ur: "ادائیگی" },
  boarded: { en: "boarded", ur: "سوار" },
  notBoarded: { en: "not boarded yet", ur: "ابھی سوار نہیں" },
  openAdmin: { en: "Open the ticket in admin", ur: "ایڈمن میں ٹکٹ کھولیں" },
  readOnly: { en: "This page only shows the ticket. Nothing can be changed here.", ur: "یہ صفحہ صرف ٹکٹ دکھاتا ہے۔ یہاں کچھ تبدیل نہیں ہو سکتا۔" },
  website: { en: "New Khan website", ur: "نیو خان ویب سائٹ" },
};

const TONE = {
  valid: "border-green-600 bg-green-50 text-green-900",
  completed: "border-neutral-500 bg-neutral-100 text-neutral-900",
  cancelled: "border-red-600 bg-red-50 text-red-900",
  unpaid: "border-amber-500 bg-amber-50 text-amber-900",
  expired: "border-neutral-500 bg-neutral-100 text-neutral-900",
};
const ICON = { valid: "✓", completed: "✓", cancelled: "✕", unpaid: "!", expired: "✕" };

function startLang() {
  try {
    return localStorage.getItem(LANG_KEY) === "ur" ? "ur" : "en";
  } catch {
    return "en";
  }
}

export default function TicketCheck() {
  const { token } = useParams();
  const session = useSession();
  const [lang, setLang] = useState(startLang);
  const [state, setState] = useState({ kind: "loading" });
  const t = (k) => T[k][lang];

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    const path = `/tickets/check/${encodeURIComponent(token)}`;
    try {
      let res;
      try {
        res = await apiRequest(path, { auth: Boolean(session) });
      } catch (e) {
        // A signed-in session that has run out: show the public view instead of an error.
        if (session && e.code === "AUTH_REQUIRED") res = await apiRequest(path);
        else throw e;
      }
      setState({ kind: "ok", ticket: res.data });
    } catch (e) {
      if (e.code === "NOT_FOUND" || e.code === "INVALID_INPUT") setState({ kind: "notfound" });
      else setState({ kind: "error", msg: e.message });
    }
  }, [token, session?.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (IS_LIVE) load();
  }, [load]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    document.title = `${T.title[lang]} · New Khan`;
  }, [lang]);

  const switchLang = () => {
    const next = lang === "ur" ? "en" : "ur";
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // storage blocked: the switch still works for this visit
    }
  };

  const frame = (children) => (
    <div className="min-h-screen bg-neutral-100 px-4 py-6" dir={lang === "ur" ? "rtl" : "ltr"}>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to={`/${lang}`} className="flex items-center gap-2 no-underline">
            <img src="/new-khan-logo-2026.png" alt="New Khan" className="h-9 w-auto" />
            <span className="font-bold text-black">{t("title")}</span>
          </Link>
          <button type="button" onClick={switchLang} className="rounded-lg border-2 border-black bg-white px-3 py-1 text-sm font-semibold">
            {lang === "ur" ? "English" : "اردو"}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
  const notice = (title, body, action) =>
    frame(
      <div role={state.kind === "loading" ? "status" : "alert"} className="rounded-2xl border-2 border-black bg-white p-5 text-center">
        <h1 className="text-lg font-bold text-black">{title}</h1>
        {body && <p className="mt-2 text-sm text-neutral-600">{body}</p>}
        {action}
      </div>,
    );

  if (!IS_LIVE) return notice(t("demo"));
  if (state.kind === "loading") return notice(t("loading"));
  if (state.kind === "notfound") return notice(t("notFound"), t("notFoundBody"));
  if (state.kind === "error")
    return notice(t("error"), state.msg, <button type="button" onClick={load} className="mt-4 rounded-lg border-2 border-black px-4 py-2 text-sm font-semibold">{t("retry")}</button>);

  const x = state.ticket;
  const row = (k, v) => (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-neutral-600">{k}</dt>
      <dd className="text-end font-semibold text-black">{v}</dd>
    </div>
  );
  return frame(
    <main className="grid gap-4">
      <section role="status" className={`rounded-2xl border-2 p-5 text-center ${TONE[x.state] ?? TONE.expired}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-current text-3xl font-bold" aria-hidden>{ICON[x.state] ?? "!"}</div>
        <h1 className="mt-2 text-2xl font-extrabold">{t(x.state)}</h1>
        <p className="mt-1 text-sm">{t(`${x.state}Body`)}</p>
      </section>

      <section className="rounded-2xl border-2 border-black bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{t("pnr")}</p>
        <p className="ltr font-mono text-3xl font-bold tracking-wider text-black">{x.pnr}</p>
        <dl className="mt-3 divide-y divide-neutral-200 text-sm">
          {row(t("from"), x.boardingTerminal)}
          {row(t("to"), x.droppingTerminal)}
          {row(t("departs"), lang === "ur" ? `${fmtDate(x.boardingAt, lang)}، ${fmtTime(x.boardingAt, lang)}` : fmtDateTime(x.boardingAt, lang))}
        </dl>
        <h2 className="mt-4 text-sm font-bold text-black">{t("seats")}</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-300">
          {x.seats.map((s) => (
            <li key={s.seat} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${s.cancelled ? "text-neutral-400 line-through" : ""}`}>
              <span className="font-semibold">{s.name}</span>
              <span className="whitespace-nowrap">
                {t("seat")} <b>{s.seat}</b>
                {s.cancelled ? ` · ${t("seatCancelled")}` : x.staff && s.status ? ` · ${s.status === "boarded" ? t("boarded") : t("notBoarded")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {x.staff && (
        <section className="rounded-2xl border-2 border-sky-700 bg-sky-50 p-5">
          <h2 className="text-sm font-bold text-sky-900">{t("staffTitle")}</h2>
          <dl className="mt-2 divide-y divide-sky-200 text-sm">
            {row(t("contact"), <span className="ltr">{x.contactName} · {x.contactPhone}</span>)}
            {x.holderCnicMasked && row(t("cnic"), <span className="ltr font-mono">{x.holderCnicMasked}</span>)}
            {row(t("bus"), <span className="ltr">{x.bus}</span>)}
            {row(t("paid"), <span className="ltr">{pkr(x.paidAmount)} / {pkr(x.totalAmount)}{x.paidBy?.length ? ` · ${x.paidBy.join(", ")}` : ""}</span>)}
          </dl>
          <Link to={`/admin/ticket/${x.bookingId}`} className="mt-3 inline-block text-sm font-semibold text-sky-900 underline">{t("openAdmin")}</Link>
        </section>
      )}

      <p className="text-center text-xs text-neutral-500">{t("readOnly")}</p>
      <p className="text-center text-sm">
        <Link to={`/${lang}`} className="font-semibold underline">{t("website")}</Link>
      </p>
    </main>,
  );
}
