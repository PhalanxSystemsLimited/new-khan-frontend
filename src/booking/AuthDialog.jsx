import { toast } from "../components/Toast";
import { useEffect, useRef, useState } from "react";
import { apiLogin, apiOtpSend, apiOtpVerify, apiSignup } from "./live/liveApi";

const T = {
  title: { en: "Sign in to New Khan", ur: "نیو خان میں سائن ان کریں" },
  why: { en: "Your bookings are saved to your account so you can pay, cancel and find them later.", ur: "آپ کی بکنگز آپ کے اکاؤنٹ میں محفوظ رہتی ہیں تاکہ آپ بعد میں ادائیگی، منسوخی اور تلاش کر سکیں۔" },
  signin: { en: "Sign in", ur: "سائن ان" },
  signup: { en: "Create account", ur: "اکاؤنٹ بنائیں" },
  phoneCode: { en: "Phone code", ur: "فون کوڈ" },
  name: { en: "Full name", ur: "پورا نام" },
  email: { en: "Email", ur: "ای میل" },
  password: { en: "Password", ur: "پاس ورڈ" },
  pwHint: { en: "At least 8 characters, with upper-case, lower-case and a number.", ur: "کم از کم 8 حروف، بڑے اور چھوٹے حروف اور ایک ہندسہ۔" },
  phone: { en: "Mobile number", ur: "موبائل نمبر" },
  phoneOpt: { en: "Mobile number (optional)", ur: "موبائل نمبر (اختیاری)" },
  cnic: { en: "CNIC", ur: "شناختی کارڈ نمبر" },
  cnicHint: {
    en: "Added to every booking you make. Show this CNIC at a counter to cancel a booking and collect a refund.",
    ur: "آپ کی ہر بکنگ میں شامل ہو گا۔ کاؤنٹر پر بکنگ منسوخ کرنے اور رقم واپس لینے کے لیے یہی شناختی کارڈ دکھائیں۔",
  },
  cnicErr: { en: "Enter your 13-digit CNIC, like 35202-1234567-1.", ur: "اپنا 13 ہندسوں کا شناختی کارڈ نمبر لکھیں، جیسے 35202-1234567-1۔" },
  sendCode: { en: "Send code", ur: "کوڈ بھیجیں" },
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
      setMsg({ kind: "error", text: e.message });
    }
    setBusy(false);
  }

  const done = () => {
    toast(lang === "ur" ? "سائن ان ہو گیا" : "Signed in", { duration: 3000 });
    onClose?.();
    onSuccess?.();
  };

  function submit(e) {
    e.preventDefault();
    if (mode === "signin") return run(async () => { await apiLogin(f.email.trim(), f.password); done(); });
    if (mode === "signup") {
      if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) return setMsg({ kind: "error", text: t("cnicErr") });
      return run(async () => {
        const r = await apiSignup(f.name.trim(), f.email.trim(), f.password, f.phone.trim() || undefined, f.cnic);
        if (r.needsConfirmation) {
          setMode("signin");
          setMsg({ kind: "ok", text: t("checkEmail") });
        } else done();
      });
    }
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

        <div role="tablist" className="mt-4 flex rounded-xl border border-black p-1">
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
              <div>
                <label htmlFor="au-pw" className="label">{t("password")}</label>
                <input id="au-pw" type="password" className="field" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={f.password} onChange={set("password")} required />
                {mode === "signup" && <p className="mt-1 text-xs text-mute">{t("pwHint")}</p>}
              </div>
            </>
          )}
          {(mode === "otp" || mode === "signup") && (
            <div>
              <label htmlFor="au-phone" className="label">{t(mode === "signup" ? "phoneOpt" : "phone")}</label>
              <input id="au-phone" className="field ltr" inputMode="tel" autoComplete="tel" placeholder="0311 1007555" value={f.phone} onChange={set("phone")} />
            </div>
          )}
          {mode === "signup" && (
            <div>
              <label htmlFor="au-cnic" className="label">{t("cnic")}</label>
              <input
                id="au-cnic"
                className="field ltr"
                inputMode="numeric"
                autoComplete="off"
                placeholder="35202-1234567-1"
                value={f.cnic}
                onChange={setCnic}
                required
                aria-describedby="au-cnic-hint"
              />
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

        <button type="submit" disabled={busy} className="btn btn-gold mt-5 w-full disabled:opacity-50">
          {busy ? t("working") : mode === "otp" ? t(codeSent ? "verify" : "sendCode") : t(mode)}
        </button>
      </form>
    </dialog>
  );
}
