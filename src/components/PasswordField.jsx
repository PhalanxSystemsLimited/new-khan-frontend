/**
 * Password box with a show / hide eye button, and the live checklist of password rules.
 * The rules match the backend (utils/schemas.js `password`) and Supabase Auth's password requirements.
 */
import { useState } from "react";

/** Symbols Supabase Auth accepts as a "special character". */
const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"|<>?,./`~\\]/;

export const PW_RULES = [
  { key: "len", test: (p) => p.length >= 8, en: "At least 8 characters", ur: "کم از کم 8 حروف" },
  { key: "upper", test: (p) => /[A-Z]/.test(p), en: "One upper-case letter (A-Z)", ur: "ایک بڑا حرف (A-Z)" },
  { key: "lower", test: (p) => /[a-z]/.test(p), en: "One lower-case letter (a-z)", ur: "ایک چھوٹا حرف (a-z)" },
  { key: "digit", test: (p) => /\d/.test(p), en: "One number (0-9)", ur: "ایک ہندسہ (0-9)" },
  { key: "special", test: (p) => SPECIAL.test(p), en: "One special character (e.g. ! @ # $ %)", ur: "ایک خاص نشان (جیسے ! @ # $ %)" },
];

/** True when the password meets every rule. */
export const passwordOk = (p) => p.length <= 72 && PW_RULES.every((r) => r.test(p));

export function PasswordInput({ id, value, onChange, lang = "en", autoComplete = "new-password", required, className = "field" }) {
  const [show, setShow] = useState(false);
  const label = show ? (lang === "ur" ? "پاس ورڈ چھپائیں" : "Hide password") : lang === "ur" ? "پاس ورڈ دکھائیں" : "Show password";
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className={className}
        style={{ paddingInlineEnd: 48 }}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={label}
        title={label}
        aria-pressed={show}
        className="absolute inset-y-0 flex w-11 items-center justify-center text-black/60 hover:text-black"
        style={{ insetInlineEnd: 2 }}
      >
        {show ? (
          // eye with a line through it: the password is showing, click to hide
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * The rules, each red until the typed password meets it, then green.
 * Pass `repeat` (the "type it again" box) to add a "both passwords match" line.
 */
export function PasswordChecklist({ value, repeat, lang = "en" }) {
  const items = PW_RULES.map((r) => ({ key: r.key, ok: r.test(value), text: lang === "ur" ? r.ur : r.en }));
  if (repeat !== undefined) {
    items.push({ key: "match", ok: value.length > 0 && value === repeat, text: lang === "ur" ? "دونوں پاس ورڈ ایک جیسے ہیں" : "Both passwords match" });
  }
  return (
    <ul className="mt-2 grid gap-1 text-sm" aria-live="polite">
      {items.map((i) => (
        <li key={i.key} className={`flex items-center gap-2 font-medium ${i.ok ? "text-green-700" : "text-red-700"}`}>
          <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${i.ok ? "bg-green-600" : "bg-red-600"}`}>
            {i.ok ? (
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            )}
          </span>
          <span>{i.text}</span>
          <span className="sr-only">{i.ok ? (lang === "ur" ? "(مکمل)" : "(done)") : lang === "ur" ? "(باقی)" : "(missing)"}</span>
        </li>
      ))}
    </ul>
  );
}
