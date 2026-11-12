/**
 * "Verify your mobile number" box for online booking. Only appears when SMS is set up on the server: the booking
 * then answers PHONE_NOT_VERIFIED and the seats page opens this. Asked once per number.
 */
import { useEffect, useRef, useState } from "react";
import { apiPhoneSendCode, apiPhoneVerify } from "./live/liveApi";

const T = {
  title: { en: "Verify your mobile number", ur: "اپنا موبائل نمبر تصدیق کریں" },
  intro: { en: "We send a 6-digit code by SMS to", ur: "ہم 6 ہندسوں کا کوڈ SMS سے بھیجیں گے اس نمبر پر:" },
  once: { en: "You only do this once for this number.", ur: "یہ اس نمبر کے لیے صرف ایک بار کرنا ہو گا۔" },
  send: { en: "Send code", ur: "کوڈ بھیجیں" },
  resend: { en: "Send a new code", ur: "نیا کوڈ بھیجیں" },
  sent: { en: "Code sent to {to}. It is valid for {n} minutes.", ur: "کوڈ {to} پر بھیج دیا گیا۔ یہ {n} منٹ کے لیے درست ہے۔" },
  code: { en: "6-digit code", ur: "6 ہندسوں کا کوڈ" },
  verify: { en: "Verify and book", ur: "تصدیق کریں اور بُک کریں" },
  working: { en: "Please wait…", ur: "انتظار کریں…" },
  cancel: { en: "Cancel", ur: "منسوخ" },
  sixDigits: { en: "Enter the 6 digits from the SMS.", ur: "SMS میں موجود 6 ہندسے لکھیں۔" },
  devCode: { en: "Test mode (SMS is off): the code is {code}", ur: "ٹیسٹ موڈ (SMS بند ہے): کوڈ {code} ہے" },
};

export function PhoneVerifyDialog({ lang, phone, open, onClose, onVerified }) {
  const t = (k, v = {}) => Object.entries(v).reduce((s, [a, b]) => s.replaceAll(`{${a}}`, b), T[k][lang]);
  const ref = useRef(null);
  const [st, setSt] = useState({ sent: null, code: "", busy: false, err: "" });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setSt({ sent: null, code: "", busy: false, err: "" });
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  async function send() {
    setSt((s) => ({ ...s, busy: true, err: "" }));
    try {
      const r = await apiPhoneSendCode(phone);
      if (r.alreadyVerified) return onVerified();
      setSt((s) => ({ ...s, busy: false, sent: r }));
    } catch (e) {
      setSt((s) => ({ ...s, busy: false, err: e.message }));
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(st.code.trim())) return setSt((s) => ({ ...s, err: t("sixDigits") }));
    setSt((s) => ({ ...s, busy: true, err: "" }));
    try {
      await apiPhoneVerify(phone, st.code.trim());
      onVerified();
    } catch (err) {
      setSt((s) => ({ ...s, busy: false, err: err.message }));
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(92vw,420px)] rounded-2xl border-2 border-black p-0 backdrop:bg-black/50">
      <form onSubmit={verify} className="p-5 sm:p-6">
        <h2 className="text-xl font-bold text-black">{t("title")}</h2>
        <p className="mt-2 text-sm text-mute">
          {t("intro")} <b className="ltr text-black">{phone}</b>. {t("once")}
        </p>
        {st.sent ? (
          <>
            <p role="status" className="mt-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              {t("sent", { to: st.sent.sentTo, n: String(st.sent.expiresInMinutes) })}
            </p>
            {st.sent.devCode && <p className="mt-2 text-sm font-semibold text-amber-800">{t("devCode", { code: st.sent.devCode })}</p>}
            <label htmlFor="pv-code" className="label mt-4">{t("code")}</label>
            <input
              id="pv-code"
              className="field ltr tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={st.code}
              onChange={(e) => setSt((s) => ({ ...s, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              autoFocus
            />
          </>
        ) : null}
        {st.err && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{st.err}</p>}
        <div className="mt-5 flex flex-col gap-2">
          {st.sent ? (
            <>
              <button type="submit" className="btn btn-gold w-full" disabled={st.busy}>{st.busy ? t("working") : t("verify")}</button>
              <button type="button" className="text-sm font-semibold underline" disabled={st.busy} onClick={send}>{t("resend")}</button>
            </>
          ) : (
            <button type="button" className="btn btn-gold w-full" disabled={st.busy} onClick={send}>{st.busy ? t("working") : t("send")}</button>
          )}
          <button type="button" className="btn btn-ghost w-full" disabled={st.busy} onClick={onClose}>{t("cancel")}</button>
        </div>
      </form>
    </dialog>
  );
}
