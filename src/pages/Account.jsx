/**
 * /:lang/account: the signed-in customer's own profile.
 *   - details: name, email (cannot be changed here), mobile, CNIC, gender, date of birth, member since
 *   - edit them (PATCH /users/me)
 *   - change password (POST /auth/password/reset with the signed-in session)
 * Not signed in: asks to sign in.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../components/parts";
import { toast } from "../components/Toast";
import { AuthDialog } from "../booking/AuthDialog";
import { IS_LIVE } from "../booking/api";
import { signOut, useSession } from "../booking/auth";
import { apiRequest } from "../booking/live/liveApi";
import { isStaffRole, refreshMe } from "../booking/useRole";
import { href } from "../lib/links";
import { useLang } from "../lib/useLang";

const T = {
  title: { en: "My account", ur: "میرا اکاؤنٹ" },
  intro: { en: "Your details are used on your tickets and to contact you about your trips.", ur: "آپ کی تفصیلات ٹکٹوں پر اور آپ کے سفر کے بارے میں رابطے کے لیے استعمال ہوتی ہیں۔" },
  signInTitle: { en: "Sign in to see your account", ur: "اپنا اکاؤنٹ دیکھنے کے لیے سائن ان کریں" },
  signInBody: { en: "Your profile, bookings and password are here once you sign in.", ur: "سائن ان کرنے کے بعد آپ کی پروفائل، بکنگز اور پاس ورڈ یہاں ہوں گے۔" },
  notLive: { en: "Accounts are not available on this preview of the site.", ur: "سائٹ کے اس پری ویو پر اکاؤنٹس دستیاب نہیں ہیں۔" },
  signIn: { en: "Sign in", ur: "سائن ان کریں" },
  signOut: { en: "Sign out", ur: "سائن آؤٹ" },
  loading: { en: "Loading your details…", ur: "آپ کی تفصیلات لوڈ ہو رہی ہیں…" },
  loadFailed: { en: "Your details could not be loaded. Please refresh the page.", ur: "آپ کی تفصیلات لوڈ نہیں ہو سکیں۔ براہِ کرم صفحہ ریفریش کریں۔" },
  details: { en: "Profile details", ur: "پروفائل کی تفصیلات" },
  name: { en: "Full name", ur: "پورا نام" },
  email: { en: "Email", ur: "ای میل" },
  emailNote: { en: "To change your email, contact the New Khan helpline.", ur: "ای میل تبدیل کرنے کے لیے نیو خان ہیلپ لائن سے رابطہ کریں۔" },
  phone: { en: "Mobile number", ur: "موبائل نمبر" },
  cnic: { en: "CNIC (optional)", ur: "شناختی کارڈ نمبر (اختیاری)" },
  gender: { en: "Gender (optional)", ur: "جنس (اختیاری)" },
  male: { en: "Male", ur: "مرد" },
  female: { en: "Female", ur: "خاتون" },
  notSaid: { en: "Not given", ur: "نہیں بتایا" },
  dob: { en: "Date of birth (optional)", ur: "تاریخِ پیدائش (اختیاری)" },
  since: { en: "Member since", ur: "رکنیت کی تاریخ" },
  role: { en: "Account type", ur: "اکاؤنٹ کی قسم" },
  terminal: { en: "Terminal", ur: "ٹرمینل" },
  edit: { en: "Edit details", ur: "تفصیلات میں ترمیم" },
  save: { en: "Save changes", ur: "تبدیلیاں محفوظ کریں" },
  cancel: { en: "Cancel", ur: "منسوخ" },
  saving: { en: "Saving…", ur: "محفوظ کیا جا رہا ہے…" },
  saved: { en: "Your details are saved", ur: "آپ کی تفصیلات محفوظ ہو گئیں" },
  nameErr: { en: "Enter your full name.", ur: "اپنا پورا نام لکھیں۔" },
  phoneErr: { en: "Enter a Pakistani mobile number, like 03001234567.", ur: "پاکستانی موبائل نمبر لکھیں، جیسے 03001234567۔" },
  cnicErr: { en: "CNIC must be 13 digits, like 35202-1234567-1.", ur: "شناختی کارڈ نمبر 13 ہندسوں کا ہو، جیسے 35202-1234567-1۔" },
  saveFailed: { en: "Your details could not be saved.", ur: "آپ کی تفصیلات محفوظ نہیں ہو سکیں۔" },
  pwTitle: { en: "Change password", ur: "پاس ورڈ تبدیل کریں" },
  pwNew: { en: "New password", ur: "نیا پاس ورڈ" },
  pwRepeat: { en: "Type it again", ur: "دوبارہ لکھیں" },
  pwHint: { en: "At least 8 characters, with upper-case, lower-case and a number.", ur: "کم از کم 8 حروف، بڑے اور چھوٹے حروف اور ایک ہندسہ۔" },
  pwWeak: { en: "Use at least 8 characters with upper-case, lower-case and a number.", ur: "کم از کم 8 حروف استعمال کریں جن میں بڑے اور چھوٹے حروف اور ایک ہندسہ ہو۔" },
  pwMismatch: { en: "The two passwords are not the same.", ur: "دونوں پاس ورڈ ایک جیسے نہیں ہیں۔" },
  pwSave: { en: "Change password", ur: "پاس ورڈ تبدیل کریں" },
  pwDone: { en: "Your password is changed. Other devices have been signed out.", ur: "آپ کا پاس ورڈ تبدیل ہو گیا۔ دوسرے آلات سے سائن آؤٹ کر دیا گیا ہے۔" },
  pwFailed: { en: "The password could not be changed. Please sign in again and retry.", ur: "پاس ورڈ تبدیل نہیں ہو سکا۔ دوبارہ سائن ان کر کے کوشش کریں۔" },
  myBookings: { en: "My bookings", ur: "میری بکنگز" },
  admin: { en: "Open the admin panel", ur: "ایڈمن پینل کھولیں" },
};

const ROLES = {
  customer: ["Customer", "کسٹمر"],
  agent: ["Counter staff", "کاؤنٹر اسٹاف"],
  driver: ["Driver", "ڈرائیور"],
  conductor: ["Conductor", "کنڈکٹر"],
  manager: ["Manager", "مینیجر"],
  admin: ["Admin", "ایڈمن"],
  super_admin: ["Super admin", "سپر ایڈمن"],
};

const strong = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);
const PHONE_RE = /^(?:\+92|0092|92|0)?3\d{9}$/;
const CNIC_RE = /^\d{5}-?\d{7}-?\d$/;

/** "+923001234567" -> "03001234567", the way people in Pakistan type it. */
const localPhone = (p) => (p && /^\+923\d{9}$/.test(p) ? `0${p.slice(3)}` : p || "");

const formFrom = (me) => ({
  fullName: me.fullName || "",
  phone: localPhone(me.phone),
  cnic: me.cnic || "",
  gender: me.gender || "",
  dateOfBirth: me.dateOfBirth ? String(me.dateOfBirth).slice(0, 10) : "",
});

export default function Account() {
  const lang = useLang();
  const t = (k) => T[k][lang];
  const session = useSession();
  const token = session?.accessToken;
  usePageMeta(t("title"));

  const [me, setMe] = useState(null);
  const [loadErr, setLoadErr] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [save, setSave] = useState({ busy: false, err: "" });
  const [pw, setPw] = useState({ a: "", b: "", busy: false, err: "", ok: "" });

  useEffect(() => {
    if (!IS_LIVE || !token) return setMe(null);
    let live = true;
    setLoadErr(false);
    apiRequest("/users/me", { auth: true }).then(
      (r) => live && setMe(r.data ?? null),
      () => live && setLoadErr(true),
    );
    return () => {
      live = false;
    };
  }, [token]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function saveDetails(e) {
    e.preventDefault();
    const f = form;
    if (f.fullName.trim().length < 2) return setSave({ busy: false, err: t("nameErr") });
    const tel = f.phone.replace(/[\s-]/g, "");
    if (!PHONE_RE.test(tel)) return setSave({ busy: false, err: t("phoneErr") });
    if (f.cnic.trim() && !CNIC_RE.test(f.cnic.trim())) return setSave({ busy: false, err: t("cnicErr") });
    setSave({ busy: true, err: "" });
    try {
      const r = await apiRequest("/users/me", {
        method: "PATCH",
        auth: true,
        body: {
          fullName: f.fullName.trim(),
          phone: tel,
          cnic: f.cnic.trim() || null,
          gender: f.gender || null,
          dateOfBirth: f.dateOfBirth || null,
        },
      });
      setMe(r.data);
      refreshMe(); // other screens (booking form, header) pick up the new details
      setEditing(false);
      setSave({ busy: false, err: "" });
      toast(t("saved"), { kind: "success", duration: 3000 });
    } catch (err) {
      setSave({ busy: false, err: err?.message || t("saveFailed") });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!strong(pw.a)) return setPw({ ...pw, err: t("pwWeak"), ok: "" });
    if (pw.a !== pw.b) return setPw({ ...pw, err: t("pwMismatch"), ok: "" });
    setPw({ ...pw, busy: true, err: "", ok: "" });
    try {
      await apiRequest("/auth/password/reset", { method: "POST", auth: true, body: { password: pw.a } });
      setPw({ a: "", b: "", busy: false, err: "", ok: t("pwDone") });
    } catch {
      setPw((p) => ({ ...p, busy: false, err: t("pwFailed") }));
    }
  }

  const box = (children) => (
    <div className="container-nk pk-section">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
  const errBox = (text) => text && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{text}</p>;

  if (!IS_LIVE) return box(<div className="pk-card" style={{ padding: 28 }}><h1 className="h2">{t("title")}</h1><p className="mt-2">{t("notLive")}</p></div>);

  if (!session)
    return box(
      <div className="pk-card" style={{ padding: 28 }}>
        <h1 className="h2">{t("signInTitle")}</h1>
        <p className="mt-2">{t("signInBody")}</p>
        <button type="button" className="btn btn-gold mt-6" onClick={() => setAuthOpen(true)}>{t("signIn")}</button>
        <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />
      </div>,
    );

  if (!me) return box(<div className="pk-card" style={{ padding: 28 }}><p>{loadErr ? t("loadFailed") : t("loading")}</p></div>);

  const roleName = ROLES[me.role] ? ROLES[me.role][lang === "ur" ? 1 : 0] : me.role;
  const since = me.createdAt ? new Date(me.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const dob = me.dateOfBirth ? new Date(`${String(me.dateOfBirth).slice(0, 10)}T00:00:00`).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : t("notSaid");
  const rows = [
    [t("name"), me.fullName || "—"],
    [t("email"), me.email || "—"],
    [t("phone"), localPhone(me.phone) || "—"],
    [t("cnic"), me.cnic || t("notSaid")],
    [t("gender"), me.gender ? t(me.gender) : t("notSaid")],
    [t("dob"), dob],
    [t("role"), roleName],
    ...(me.terminalName ? [[t("terminal"), me.terminalName]] : []),
    [t("since"), since],
  ];

  return box(
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h2">{t("title")}</h1>
          <p className="mt-1 text-mute">{t("intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={href(lang, "/book/my-bookings")} className="btn btn-ghost">{t("myBookings")}</Link>
          {isStaffRole(me.role) && <Link to="/admin" className="btn btn-ghost">{t("admin")}</Link>}
        </div>
      </div>

      {/* Details */}
      <div className="pk-card mt-6" style={{ padding: 24 }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("details")}</h2>
          {!editing && (
            <button type="button" className="pk-btn pk-btn-s" onClick={() => { setForm(formFrom(me)); setSave({ busy: false, err: "" }); setEditing(true); }}>
              {t("edit")}
            </button>
          )}
        </div>

        {!editing ? (
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-mute">{k}</dt>
                <dd className="mt-0.5 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <form onSubmit={saveDetails} noValidate className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="acc-name" className="label">{t("name")}</label>
                <input id="acc-name" className="field" autoComplete="name" value={form.fullName} onChange={set("fullName")} required />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="acc-email" className="label">{t("email")}</label>
                <input id="acc-email" className="field" value={me.email || ""} readOnly disabled />
                <p className="mt-1 text-xs text-mute">{t("emailNote")}</p>
              </div>
              <div>
                <label htmlFor="acc-phone" className="label">{t("phone")}</label>
                <input id="acc-phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="03001234567" value={form.phone} onChange={set("phone")} required />
              </div>
              <div>
                <label htmlFor="acc-cnic" className="label">{t("cnic")}</label>
                <input id="acc-cnic" inputMode="numeric" className="field" placeholder="35202-1234567-1" value={form.cnic} onChange={set("cnic")} />
              </div>
              <div>
                <label htmlFor="acc-gender" className="label">{t("gender")}</label>
                <select id="acc-gender" className="field" value={form.gender} onChange={set("gender")}>
                  <option value="">{t("notSaid")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="acc-dob" className="label">{t("dob")}</label>
                <input id="acc-dob" type="date" className="field" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={set("dateOfBirth")} />
              </div>
            </div>
            {errBox(save.err)}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="btn btn-gold" disabled={save.busy}>{save.busy ? t("saving") : t("save")}</button>
              <button type="button" className="btn btn-ghost" disabled={save.busy} onClick={() => setEditing(false)}>{t("cancel")}</button>
            </div>
          </form>
        )}
      </div>

      {/* Password */}
      <form onSubmit={changePassword} noValidate className="pk-card mt-6" style={{ padding: 24 }}>
        <h2 className="text-lg font-bold">{t("pwTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-pw" className="label">{t("pwNew")}</label>
            <input id="acc-pw" type="password" className="field" autoComplete="new-password" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value, ok: "" })} />
          </div>
          <div>
            <label htmlFor="acc-pw2" className="label">{t("pwRepeat")}</label>
            <input id="acc-pw2" type="password" className="field" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value, ok: "" })} />
          </div>
        </div>
        <p className="mt-1 text-xs text-mute">{t("pwHint")}</p>
        {errBox(pw.err)}
        {pw.ok && <p role="status" className="mt-3 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-900">{pw.ok}</p>}
        <button type="submit" className="btn btn-gold mt-5" disabled={pw.busy}>{pw.busy ? t("saving") : t("pwSave")}</button>
      </form>

      <div className="mt-6">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => signOut().then(() => toast(lang === "ur" ? "سائن آؤٹ ہو گیا" : "Signed out", { kind: "info", duration: 3000 }))}
        >
          {t("signOut")}
        </button>
      </div>
    </>,
  );
}
