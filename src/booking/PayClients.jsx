import { toast } from "../components/Toast";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { completeMockPayment, getBooking, getPaymentMethods, goToGateway, IS_LIVE, startPayment } from "./api";
import { AuthDialog } from "./AuthDialog";
import { Countdown } from "./BookingView";
import { ApiError } from "./errors";
import { bookUrl } from "./hooks";
import { bt } from "./strings";
import { fmtDateTime, pkr } from "./time";
import { isStaffRole, useRole } from "./useRole";
import { apiRequest } from "./live/liveApi";

const METHODS = [
  { id: "jazzcash", bg: "bg-red-700", fg: "text-white" },
  { id: "easypaisa", bg: "bg-green-700", fg: "text-white" },
  { id: "card", bg: "bg-black", fg: "text-white" },
];

/** Loads the booking and reports whether it can still be paid. */
function useHeldBooking(ref) {
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const refresh = useCallback(async () => {
    if (!ref) return setErr("No booking reference.");
    try {
      setB(await getBooking(ref));
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, [ref]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { b, err, refresh };
}

function Blocked({ lang, b, err, bookingRef }) {
  return (
    <div role="alert" className="card mt-6 border-2 border-red-300">
      <p className="font-semibold text-red-900">
        {err || (b?.status === "EXPIRED" ? bt("payBlockedExpired", lang) : bt("payBlockedState", lang, { status: b ? bt(`status${b.status}`, lang) : "" }))}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {b && <Link to={bookUrl(lang, "reserved", { ref: bookingRef })} className="btn btn-ghost">{bt("viewBooking", lang)}</Link>}
        <Link to={`/${lang}/book`} className="btn btn-gold">{bt("searchAgain", lang)}</Link>
      </div>
    </div>
  );
}

export function PayClient({ lang }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const ref = sp.get("ref");
  const { b, err, refresh } = useHeldBooking(ref);
  const [method, setMethod] = useState("jazzcash");
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const staff = isStaffRole(useRole());

  /** Counter sale: staff took the cash, so the booking is confirmed at once (POST /payments/cash). */
  async function cashReceived() {
    if (!b || !window.confirm(`Cash ${pkr(b.total)} received for ${b.ref}? The booking will be confirmed now.`)) return;
    setBusy(true);
    setProblem("");
    try {
      await apiRequest("/payments/cash", { method: "POST", auth: true, body: { bookingId: ref, amount: b.total } });
      toast(bt("toastConfirmed", lang), { body: bt("toastConfirmedBody", lang, { ref: b.ref }) });
      navigate(bookUrl(lang, "confirmed", { ref }));
    } catch (e) {
      setProblem(e.message);
      setBusy(false);
      refresh();
    }
  }

  useEffect(() => {
    getPaymentMethods()
      .then((l) => {
        const ok = l.filter((m) => m.available).map((m) => m.id);
        setAvailable(ok);
        setMethod((cur) => (ok.includes(cur) ? cur : (ok[0] ?? cur)));
      })
      .catch(() => setAvailable([]));
  }, []);

  async function pay() {
    if (!b) return;
    setBusy(true);
    setProblem("");
    try {
      const s = await startPayment(ref, method, lang);
      if (s.kind === "mock") navigate(bookUrl(lang, "gateway", { ref, method, order: s.orderId }));
      else {
        toast(bt("toastToGateway", lang), { body: bt("toastToGatewayBody", lang), kind: "info" });
        goToGateway(s); // leaves the site; the result comes back through the server
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "AUTH_REQUIRED") setAuthOpen(true);
      const text = e instanceof ApiError && e.code === "PAYMENT_UNAVAILABLE" ? bt("gatewayPending", lang) : e.message;
      setProblem(text);
      toast(bt("toastPayFailed", lang), { body: text, kind: "error" });
      setBusy(false);
      refresh();
    }
  }

  if (err && IS_LIVE && /sign in|session|authentication/i.test(err))
    return (
      <div className="card mt-6">
        <p className="text-black">{bt("signInToManage", lang)}</p>
        <button type="button" onClick={() => setAuthOpen(true)} className="btn btn-gold mt-4">{lang === "ur" ? "سائن ان" : "Sign in"}</button>
        <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={refresh} />
      </div>
    );
  if (err || (b && b.status !== "HELD")) return <Blocked lang={lang} b={b} err={err} bookingRef={ref} />;
  if (!b) return <p role="status" className="mt-6 text-mute">{bt("loading", lang)}</p>;

  return (
    <div className="mt-6">
      <div className="card text-center">
        <p className="ltr font-mono text-lg font-bold text-black">{b.ref}</p>
        {b.holdExpiresAt && (
          <>
            <Countdown expiresAt={b.holdExpiresAt} lang={lang} onZero={refresh} />
            <p className="mt-2 text-sm text-mute">{bt("holdBy", lang)} <span className="ltr font-semibold text-black">{fmtDateTime(b.holdExpiresAt, lang)}</span> {bt("holdByEnd", lang)}</p>
          </>
        )}
      </div>

      <fieldset className="mt-6">
        <legend className="h3 text-black">{bt("chooseMethod", lang)}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3" role="radiogroup">
          {METHODS.filter((m) => available?.includes(m.id)).map((m) => (
            <label key={m.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 focus-within:ring-4 focus-within:ring-gold/60 ${method === m.id ? "border-gold bg-gold/15" : "border-line bg-white"}`}>
              <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-5 w-5 accent-black" />
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${m.bg} ${m.fg}`} aria-hidden>{bt(m.id, "en").slice(0, 2).toUpperCase()}</span>
              <span className="font-semibold text-black">{bt(m.id, lang)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {available?.length === 0 && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{bt("noMethods", lang)}</p>}
      {problem && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{problem}</p>}
      <button type="button" disabled={busy || !available?.length} onClick={pay} className="btn btn-gold btn-shine mt-6 w-full text-lg disabled:opacity-50 sm:w-auto">
        {busy ? bt("processing", lang) : bt("payAmount", lang, { amount: pkr(b.total) })}
      </button>
      {IS_LIVE && staff && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-black bg-white p-4">
          <p className="text-sm font-semibold text-black">Staff only: counter sale</p>
          <p className="mt-1 text-sm text-mute">Take {pkr(b.total)} in cash, then confirm. The ticket is issued at once.</p>
          <button type="button" disabled={busy} onClick={cashReceived} className="btn btn-ghost mt-3 disabled:opacity-50">Cash received · {pkr(b.total)}</button>
        </div>
      )}
      {!IS_LIVE && <p className="mt-3 text-xs text-mute">{bt("placeholderNote", lang)}</p>}
      {IS_LIVE && <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={pay} />}
    </div>
  );
}

/** Demo-only stand-in for a gateway page. Real gateways never come here: the browser leaves the site. */
export function GatewayClient({ lang }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const ref = sp.get("ref");
  const method = sp.get("method") || "jazzcash";
  const orderId = sp.get("order") ?? "";
  const { b, err, refresh } = useHeldBooking(ref);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const m = METHODS.find((x) => x.id === method) ?? METHODS[0];

  async function run(outcome) {
    if (!b || !orderId) return;
    setBusy(true);
    setProblem("");
    try {
      await completeMockPayment(orderId, outcome);
      navigate(bookUrl(lang, "confirmed", { ref: b.ref }));
    } catch (e) {
      if (e instanceof ApiError && e.code === "PAYMENT_FAILED") {
        navigate(bookUrl(lang, "reserved", { ref: b.ref, payment: "failed" }));
        return;
      }
      setProblem(e.message);
      refresh();
      setBusy(false);
    }
  }

  if (err || (b && b.status !== "HELD")) return <Blocked lang={lang} b={b} err={err} bookingRef={ref} />;
  if (!b) return <p role="status" className="mt-6 text-mute">{bt("loading", lang)}</p>;

  return (
    <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-2xl border-2 border-black bg-white shadow-lg">
      <div className={`${m.bg} ${m.fg} p-5`}>
        <p className="text-lg font-bold">{bt("gatewayTitle", lang, { method: bt(method, lang) })}</p>
        <p className="mt-1 text-sm opacity-90">{bt("gatewayNote", lang)}</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between text-sm"><span className="text-mute">{bt("reference", lang)}</span><span className="ltr font-mono font-bold text-black">{b.ref}</span></div>
        <div className="flex items-center justify-between"><span className="text-mute">{bt("amount", lang)}</span><span className="ltr text-2xl font-bold text-black">{pkr(b.total)}</span></div>
        <Countdown expiresAt={b.holdExpiresAt} lang={lang} onZero={refresh} />
        {problem && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{problem}</p>}
        <button type="button" disabled={busy} onClick={() => run("success")} className="btn w-full bg-green-700 text-white hover:bg-green-800 disabled:opacity-50">
          {busy ? bt("processing", lang) : bt("simulateSuccess", lang)}
        </button>
        <button type="button" disabled={busy} onClick={() => run("failure")} className="btn w-full border border-red-700 text-red-800 hover:bg-red-50 disabled:opacity-50">{bt("simulateFailure", lang)}</button>
      </div>
    </div>
  );
}
