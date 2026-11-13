/**
 * Inputs that know their pattern and guide the person while typing:
 *   CnicInput   digits only, dashes added (35202-1234567-1), stops at 13 digits
 *   PhoneInput  Pakistani mobile, digits only, spaced (0300 1234567), stops at 11 digits; +92… / 92… become 0…
 * Under the field: a grey "9 of 13 digits" while typing, and a red message once the person leaves the field
 * (or the form was submitted: showErrors) if it is incomplete or invalid. With messages={false} they only format
 * (for forms that already show their own message under the field).
 * Controlled (value + onChange(text)) or, without `value`, they keep their own state (plain HTML forms with `name`).
 */
import { useId, useState } from "react";
import { CNIC_MESSAGES, cnicDigits, cnicProblem, formatCnic } from "../lib/cnic";
import { PHONE_MESSAGES, formatPhone, phoneDigitCount, phoneProblem } from "../lib/phone";

const PROGRESS = {
  en: (n, of) => `${n} of ${of} digits`,
  ur: (n, of) => `${of} میں سے ${n} ہندسے`,
};

function PatternInput({
  kind, id, value, onChange, required = false, lang = "en", className = "field", showErrors = false, messages = true,
  onBlur, describedBy, ...rest
}) {
  const auto = useId();
  const fid = id ?? auto;
  const [own, setOwn] = useState("");
  const [touched, setTouched] = useState(false);
  const controlled = value !== undefined;
  const isCnic = kind === "cnic";
  const format = isCnic ? formatCnic : formatPhone;
  // Saved values come back as "+923001234567" / "3520212345671": shown in the typed form from the start.
  const text = format(controlled ? value ?? "" : own);
  const L = lang === "ur" ? "ur" : "en";
  const count = isCnic ? cnicDigits(text).length : phoneDigitCount(text);
  const full = isCnic ? 13 : 11;
  const problem = isCnic
    ? text.trim() === "" ? (required ? "missing" : "") : cnicProblem(text)
    : phoneProblem(text, { required });
  const MSG = isCnic ? CNIC_MESSAGES : PHONE_MESSAGES;

  const showError = messages && (touched || showErrors) && problem;
  // While typing (not yet left the field): how many digits so far.
  const showProgress = messages && !showError && count > 0 && count < full;
  const msgId = `${fid}-msg`;

  return (
    <>
      <input
        {...rest}
        id={fid}
        className={`${className} ltr`}
        dir="ltr"
        inputMode={isCnic ? "numeric" : "tel"}
        autoComplete={isCnic ? "off" : "tel"}
        // No maxLength: the browser would cut a pasted "+92 300 1234567" before it is converted. The formatting
        // itself keeps at most 13 / 11 digits, so typing still stops at the full number.
        placeholder={rest.placeholder ?? (isCnic ? "35202-1234567-1" : "0300 1234567")}
        required={required}
        value={text}
        aria-invalid={showError ? true : rest["aria-invalid"]}
        aria-describedby={[describedBy, showError || showProgress ? msgId : null].filter(Boolean).join(" ") || undefined}
        onChange={(e) => {
          const next = format(e.target.value);
          if (!controlled) setOwn(next);
          onChange?.(next);
        }}
        onBlur={(e) => {
          setTouched(true);
          onBlur?.(e);
        }}
      />
      {showError && (
        <p id={msgId} role="alert" className="mt-1 text-sm text-red-700">{MSG[problem][L]}</p>
      )}
      {showProgress && (
        <p id={msgId} className="mt-1 text-xs text-neutral-500">{PROGRESS[L](count, full)}</p>
      )}
    </>
  );
}

export const CnicInput = (p) => <PatternInput kind="cnic" {...p} />;
export const PhoneInput = (p) => <PatternInput kind="phone" {...p} />;

/** For a form's own check before sending: the message for a value, or "" when fine. */
export const cnicMessage = (v, { required = false, lang = "en" } = {}) => {
  const p = String(v ?? "").trim() === "" ? (required ? "missing" : "") : cnicProblem(v);
  return p ? CNIC_MESSAGES[p][lang === "ur" ? "ur" : "en"] : "";
};
export const phoneMessage = (v, { required = false, lang = "en" } = {}) => {
  const p = phoneProblem(v, { required });
  return p ? PHONE_MESSAGES[p][lang === "ur" ? "ur" : "en"] : "";
};
