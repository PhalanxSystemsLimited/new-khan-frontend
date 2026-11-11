/**
 * /:lang/auth/callback: where the links in New Khan's emails land (AUTH_REDIRECT_URL on the backend).
 *   - account confirmation: "Your email is verified" + Sign in (opens the sign-in form)
 *   - password reset:       choose a new password, then Sign in
 *   - expired / used link:  says so, + Sign in
 * Supabase puts the outcome in the address after "#" (or "?" for errors). It is read once and then removed
 * from the address bar, so the one-time sign-in token is not left in the browser history.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../components/parts";
import { AuthDialog } from "../booking/AuthDialog";
import { apiRequest } from "../booking/live/liveApi";
import { href } from "../lib/links";
import { useLang } from "../lib/useLang";

const T = {
  verifiedTitle: { en: "Your email is verified", ur: "آپ کی ای میل کی تصدیق ہو گئی" },
  verifiedBody: {
    en: "Thank you. Your New Khan account is ready. Sign in to book seats and see your bookings.",
    ur: "شکریہ۔ آپ کا نیو خان اکاؤنٹ تیار ہے۔ سیٹیں بُک کرنے اور اپنی بکنگز دیکھنے کے لیے سائن ان کریں۔",
  },
  resetTitle: { en: "Choose a new password", ur: "نیا پاس ورڈ منتخب کریں" },
  resetBody: { en: "Enter the new password for your New Khan account.", ur: "اپنے نیو خان اکاؤنٹ کا نیا پاس ورڈ لکھیں۔" },
  newPassword: { en: "New password", ur: "نیا پاس ورڈ" },
  repeat: { en: "Type it again", ur: "دوبارہ لکھیں" },
  pwHint: { en: "At least 8 characters, with upper-case, lower-case and a number.", ur: "کم از کم 8 حروف، بڑے اور چھوٹے حروف اور ایک ہندسہ۔" },
  pwWeak: { en: "Use at least 8 characters with upper-case, lower-case and a number.", ur: "کم از کم 8 حروف استعمال کریں جن میں بڑے اور چھوٹے حروف اور ایک ہندسہ ہو۔" },
  pwMismatch: { en: "The two passwords are not the same.", ur: "دونوں پاس ورڈ ایک جیسے نہیں ہیں۔" },
  save: { en: "Save new password", ur: "نیا پاس ورڈ محفوظ کریں" },
  saving: { en: "Saving…", ur: "محفوظ کیا جا رہا ہے…" },
  savedTitle: { en: "Your password is changed", ur: "آپ کا پاس ورڈ تبدیل ہو گیا" },
  savedBody: { en: "Sign in with your new password.", ur: "اپنے نئے پاس ورڈ سے سائن ان کریں۔" },
  badTitle: { en: "This link has expired", ur: "یہ لنک ختم ہو چکا ہے" },
  badBody: {
    en: "Links in our emails work once and only for a short time. If your account is already confirmed, just sign in. Otherwise sign up again or ask for a new reset link from the sign-in form.",
    ur: "ہماری ای میلز کے لنک صرف ایک بار اور کچھ وقت کے لیے کام کرتے ہیں۔ اگر آپ کا اکاؤنٹ پہلے ہی تصدیق شدہ ہے تو بس سائن ان کریں۔ ورنہ دوبارہ اکاؤنٹ بنائیں یا سائن ان فارم سے نیا لنک منگوائیں۔",
  },
  plainTitle: { en: "Sign in to New Khan", ur: "نیو خان میں سائن ان کریں" },
  plainBody: { en: "Sign in to book seats and see your bookings.", ur: "سیٹیں بُک کرنے اور اپنی بکنگز دیکھنے کے لیے سائن ان کریں۔" },
  signIn: { en: "Sign in", ur: "سائن ان کریں" },
  home: { en: "Go to the home page", ur: "ہوم پر جائیں" },
  failed: { en: "The password could not be changed. The link may have expired: ask for a new one.", ur: "پاس ورڈ تبدیل نہیں ہو سکا۔ لنک ختم ہو چکا ہو گا: نیا لنک منگوائیں۔" },
};

/** What the email link brought: read once from "#..." and "?...", then removed from the address bar. */
function readLink() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const get = (k) => hash.get(k) ?? query.get(k);
  return { error: get("error_code") || get("error"), type: get("type"), accessToken: hash.get("access_token") };
}

const strong = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

export default function AuthCallback() {
  const lang = useLang();
  const t = (k) => T[k][lang];
  const [link] = useState(readLink);
  const [authOpen, setAuthOpen] = useState(false);
  const [pw, setPw] = useState({ a: "", b: "", busy: false, err: "", done: false });

  const kind = link.error ? "bad" : link.type === "recovery" && link.accessToken ? (pw.done ? "saved" : "reset") : link.type || link.accessToken ? "verified" : "plain";
  usePageMeta(t(`${kind === "reset" ? "reset" : kind}Title`));
  useEffect(() => {
    window.scrollTo(0, 0);
    // Remove the one-time token from the address bar (it has been read above).
    if (window.location.hash || window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  async function savePassword(e) {
    e.preventDefault();
    if (!strong(pw.a)) return setPw({ ...pw, err: t("pwWeak") });
    if (pw.a !== pw.b) return setPw({ ...pw, err: t("pwMismatch") });
    setPw({ ...pw, busy: true, err: "" });
    try {
      // The reset link's one-time session proves who this is.
      await apiRequest("/auth/password/reset", { method: "POST", body: { password: pw.a }, headers: { Authorization: `Bearer ${link.accessToken}` } });
      setPw({ a: "", b: "", busy: false, err: "", done: true });
    } catch {
      setPw((p) => ({ ...p, busy: false, err: t("failed") }));
    }
  }

  const tick = (
    <span aria-hidden className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
  const signInButtons = (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" className="btn btn-gold" onClick={() => setAuthOpen(true)}>{t("signIn")}</button>
      <Link to={href(lang)} className="btn btn-ghost">{t("home")}</Link>
    </div>
  );

  return (
    <div className="container-nk pk-section">
      <div className="pk-card mx-auto max-w-xl" style={{ padding: 28 }}>
        {(kind === "verified" || kind === "saved") && tick}
        {kind === "reset" ? (
          <form onSubmit={savePassword} noValidate>
            <h1 className="h2">{t("resetTitle")}</h1>
            <p className="mt-2">{t("resetBody")}</p>
            <div className="mt-5 space-y-3">
              <div>
                <label htmlFor="ac-pw" className="label">{t("newPassword")}</label>
                <input id="ac-pw" type="password" className="field" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} required />
                <p className="mt-1 text-xs text-mute">{t("pwHint")}</p>
              </div>
              <div>
                <label htmlFor="ac-pw2" className="label">{t("repeat")}</label>
                <input id="ac-pw2" type="password" className="field" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} required />
              </div>
            </div>
            {pw.err && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{pw.err}</p>}
            <button type="submit" className="btn btn-gold mt-5" disabled={pw.busy}>{pw.busy ? t("saving") : t("save")}</button>
          </form>
        ) : (
          <>
            <h1 className="h2">{t(`${kind}Title`)}</h1>
            <p className="mt-2">{t(`${kind}Body`)}</p>
            {signInButtons}
          </>
        )}
      </div>
      <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
    </div>
  );
}
