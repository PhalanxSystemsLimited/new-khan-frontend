import { toast } from "../components/Toast";
import { useEffect, useRef, useState } from "react";
import { PasswordChecklist, PasswordInput, passwordOk } from "../components/PasswordField";
import { CnicInput, cnicMessage, PhoneInput, phoneMessage } from "../components/PatternFields";
import { apiForgotPassword, apiLogin, apiResendConfirmation, apiOtpSend, apiOtpVerify, apiSignup } from "./live/liveApi";

const T = {
  title: { en: "Sign in to New Khan", ur: "نیو خان میں سائن ان کریں" },
  why: { en: "Your bookings are saved to your account so you can pay, cancel and find them later.", ur: "آپ کی بکنگز آپ کے اکاؤنٹ میں محفوظ رہتی ہیں تاکہ آپ بعد میں ادائیگی، منسوخی اور تلاش کر سکیں۔" },
  signin: { en: "Sign in", ur: "سائن ان" },
  signup: { en: "Create account", ur: "اکاؤنٹ بنائیں" },
  phoneCode: { en: "Phone code", ur: "فون کوڈ" },
  name: { en: "Full name", ur: "پورا نام" },
  email: { en: "Email", ur: "ای میل" },
  password: { en: "Password", ur: "پاس ورڈ" },
  pwWeak: { en: "Your password does not meet all the rules yet. Each rule turns green when it is met.", ur: "آپ کا پاس ورڈ ابھی تمام شرائط پوری نہیں کرتا۔ ہر شرط پوری ہونے پر سبز ہو جاتی ہے۔" },
  phone: { en: "Mobile number", ur: "موبائل نمبر" },
  phoneErr: { en: "Enter your mobile number, like 0300 1234567.", ur: "اپنا موبائل نمبر لکھیں، جیسے 0300 1234567۔" },
  cnic: { en: "CNIC (optional)", ur: "شناختی کارڈ نمبر (اختیاری)" },
  cnicHint: {
    en: "Optional. If you add it, it goes on every booking you make, and you show this CNIC at a counter to cancel a booking and collect a refund.",
    ur: "اختیاری۔ اگر آپ لکھیں تو یہ آپ کی ہر بکنگ میں شامل ہو گا، اور کاؤنٹر پر بکنگ منسوخ کرنے اور رقم واپس لینے کے لیے یہی شناختی کارڈ دکھانا ہو گا۔",
  },
  cnicErr: { en: "Enter your 13-digit CNIC, like 35202-1234567-1.", ur: "اپنا 13 ہندسوں کا شناختی کارڈ نمبر لکھیں، جیسے 35202-1234567-1۔" },
  sendCode: { en: "Send code", ur: "کوڈ بھیجیں" },
  forgot: { en: "Forgot password?", ur: "پاس ورڈ بھول گئے؟" },
  forgotIntro: {
    en: "Enter your account's email. We will send you a link to choose a new password.",
    ur: "اپنے اکاؤنٹ کی ای میل لکھیں۔ ہم آپ کو نیا پاس ورڈ منتخب کرنے کا لنک بھیجیں گے۔",
  },
  sendReset: { en: "Send reset link", ur: "ری سیٹ لنک بھیجیں" },
  resetSent: {
    en: "If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.",
    ur: "اگر اس ای میل کا اکاؤنٹ موجود ہے تو ری سیٹ لنک بھیج دیا گیا ہے۔ اپنا اِن باکس اور اسپام فولڈر دیکھیں۔",
  },
  verifyNow: { en: "Verify now", ur: "ابھی تصدیق کریں" },
  noVerifyMail: { en: "Didn't get the verification email?", ur: "تصدیقی ای میل نہیں ملی؟" },
  emailFirst: { en: "Type your email above first.", ur: "پہلے اوپر اپنی ای میل لکھیں۔" },
  verifySent: {
    en: "A new verification link has been sent. Open it from your inbox (check spam too), then sign in.",
    ur: "تصدیق کا نیا لنک بھیج دیا گیا ہے۔ اپنے اِن باکس (اور اسپام) سے کھولیں، پھر سائن ان کریں۔",
  },
  backToSignin: { en: "Back to sign in", ur: "سائن ان پر واپس جائیں" },
  code: { en: "6-digit code", ur: "6 ہندسوں کا کوڈ" },
  verify: { en: "Verify and sign in", ur: "تصدیق کریں اور سائن ان کریں" },
  working: { en: "Please wait…", ur: "براہِ کرم انتظار کریں…" },
  close: { en: "Close", ur: "بند کریں" },
  codeSent: { en: "If the number is valid, a code is on its way.", ur: "اگر نمبر درست ہے تو کوڈ بھیج دیا گیا ہے۔" },
  checkEmail: { en: "Account created. Check your email to confirm it, then sign in.", ur: "اکاؤنٹ بن گیا۔ ای میل میں تصدیق کریں، پھر سائن ان کریں۔" },
};

/** Native <dialog> (focus trap and Escape for free). Calls onSuccess once a session is stored. */
export function AuthDialog({ lang, open, onClose, onSuccess }) {
  const t = (k) => T[k][lang];
  const dlg = useRef(null);
  const [mode, setMode] = useState("signin");
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", code: "", cnic: "" });
  const [tried, setTried] = useState(false); // submit pressed: mobile / CNIC messages show under their fields
  /** A wrong mobile number / CNIC: the message is under the field; the cursor goes there. */
  const badField = (fid) => {
    setTried(true);
    setMsg({ kind: "", text: "" });
    document.getElementById(fid)?.focus();
  };
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  /** 3520212345671 -> 35202-1234567-1 as it is typed. */
  const setCnic = (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 13);
    setF((x) => ({ ...x, cnic: [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-") }));
  };

  async function run(fn) {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      await fn();
    } catch (e) {
      // Account exists but its email is not verified: offer to send the link again.
      const verify = e.code === "EMAIL_NOT_CONFIRMED" || e.code === "ACCOUNT_EXISTS";
      if (e.code === "ACCOUNT_EXISTS") setMode("signin");
      setMsg({ kind: "error", text: e.message, verify });
    }
    setBusy(false);
  }

  function resendVerification() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setMsg({ kind: "error", text: t("emailFirst") });
    return run(async () => { await apiResendConfirmation(f.email.trim()); setMsg({ kind: "ok", text: t("verifySent") }); });
  }

  const done = () => {
    toast(lang === "ur" ? "سائن ان ہو گیا" : "Signed in", { duration: 3000 });
    onClose?.();
    onSuccess?.();
  };

  function submit(e) {
    e.preventDefault();
    if (mode === "signin") return run(async () => { await apiLogin(f.email.trim(), f.password); done(); });
    if (mode === "forgot") return run(async () => { await apiForgotPassword(f.email.trim()); setMsg({ kind: "ok", text: t("resetSent") }); });
    if (mode === "signup") {
      if (phoneMessage(f.phone, { required: true })) return badField("au-phone");
      // Optional: checked only when something is typed.
      if (cnicMessage(f.cnic)) return badField("au-cnic");
      if (!passwordOk(f.password)) return setMsg({ kind: "error", text: t("pwWeak") });
      return run(async () => {
        const r = await apiSignup(f.name.trim(), f.email.trim(), f.password, f.phone.trim(), f.cnic || undefined);
        if (r.needsConfirmation) {
          setMode("signin");
          setMsg({ kind: "ok", text: t("checkEmail") });
        } else done();
      });
    }
    if (!codeSent && phoneMessage(f.phone, { required: true })) return badField("au-phone");
    if (!codeSent) return run(async () => { await apiOtpSend(f.phone.trim()); setCodeSent(true); setMsg({ kind: "ok", text: t("codeSent") }); });
    return run(async () => { await apiOtpVerify(f.phone.trim(), f.code.trim()); done(); });
  }

  return (
    <dialog ref={dlg} onClose={onClose} aria-labelledby="auth-h" className="m-auto w-[min(92vw,26rem)] rounded-2xl border-2 border-black p-0 backdrop:bg-black/60" dir={lang === "ur" ? "rtl" : "ltr"}>
      <form onSubmit={submit} className="p-6" noValidate>
        <div className="flex items-start justify-between gap-3">
          <h2 id="auth-h" className="h3 text-black">{t("title")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="-me-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-coal">✕</button>
        </div>
        <p className="mt-1 text-sm text-mute">{t("why")}</p>

        <div role="tablist" className="nk-auth-tabs mt-4 flex rounded-xl border border-black p-1">
          {["signin", "signup", "otp"].map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setMsg({ kind: "", text: "" }); }}
              className={`min-h-10 flex-1 rounded-lg px-2 text-sm font-semibold ${mode === m ? "bg-black text-white" : "text-black hover:bg-black/5"}`}
            >
              {t(m === "otp" ? "phoneCode" : m)}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === "signup" && (
            <div>
              <label htmlFor="au-name" className="label">{t("name")}</label>
              <input id="au-name" className="field" autoComplete="name" value={f.name} onChange={set("name")} required />
            </div>
          )}
          {mode !== "otp" && (
            <>
              <div>
                <label htmlFor="au-email" className="label">{t("email")}</label>
                <input id="au-email" type="email" className="field ltr" autoComplete="email" value={f.email} onChange={set("email")} required />
              </div>
              {mode === "forgot" ? (
                <p className="text-sm text-mute">{t("forgotIntro")}</p>
              ) : (
                <div>
                  <label htmlFor="au-pw" className="label">{t("password")}</label>
                  <PasswordInput id="au-pw" lang={lang} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={set("password")} required />
                  {mode === "signup" && <PasswordChecklist value={f.password} lang={lang} />}
                  {mode === "signin" && (
                    <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => { setMode("forgot"); setMsg({ kind: "", text: "" }); }}>
                      {t("forgot")}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {(mode === "otp" || mode === "signup") && (
            <div>
              <label htmlFor="au-phone" className="label">{t("phone")}</label>
              <PhoneInput id="au-phone" className="field" lang={lang} value={f.phone} onChange={(x) => setF((p) => ({ ...p, phone: x }))} required showErrors={tried} />
            </div>
          )}
          {mode === "signup" && (
            <div>
              <label htmlFor="au-cnic" className="label">{t("cnic")}</label>
              <CnicInput id="au-cnic" className="field" lang={lang} value={f.cnic} onChange={(x) => setF((p) => ({ ...p, cnic: x }))} showErrors={tried} describedBy="au-cnic-hint" />
              <p id="au-cnic-hint" className="mt-1 text-xs text-mute">{t("cnicHint")}</p>
            </div>
          )}
          {mode === "otp" && codeSent && (
            <div>
              <label htmlFor="au-code" className="label">{t("code")}</label>
              <input id="au-code" className="field ltr tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={f.code} onChange={set("code")} />
            </div>
          )}
        </div>

        {msg.text && (
          <p role={msg.kind === "error" ? "alert" : "status"} className={`mt-4 rounded-xl border p-3 text-sm ${msg.kind === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-green-300 bg-green-50 text-green-900"}`}>
            {msg.text}
          </p>
        )}
        {msg.verify && (
          <button type="button" disabled={busy} className="btn btn-ghost mt-3 w-full disabled:opacity-50" onClick={resendVerification}>
            {t("verifyNow")}
          </button>
        )}

        <button type="submit" disabled={busy} className="btn btn-gold mt-5 w-full disabled:opacity-50">
          {busy ? t("working") : mode === "otp" ? t(codeSent ? "verify" : "sendCode") : mode === "forgot" ? t("sendReset") : t(mode)}
        </button>
        {mode === "signin" && !msg.verify && (
          <p className="mt-3 text-center text-sm">
            {t("noVerifyMail")}{" "}
            <button type="button" disabled={busy} className="font-semibold underline" onClick={resendVerification}>
              {t("verifyNow")}
            </button>
          </p>
        )}
        {mode === "forgot" && (
          <button type="button" className="mt-3 w-full text-sm font-semibold underline" onClick={() => { setMode("signin"); setMsg({ kind: "", text: "" }); }}>
            {t("backToSignin")}
          </button>
        )}
      </form>
    </dialog>
  );
}
