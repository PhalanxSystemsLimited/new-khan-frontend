/**
 * Pakistani mobile numbers, as typed: shown as "0300 1234567" (11 digits), whatever way they are entered or pasted
 * ("+92 300 1234567", "92300…", "3001234567", "0300-1234567"). The server accepts this form (it removes the space
 * and stores +923001234567), so what is shown is also what is sent.
 */

/** The local 11-digit form, as far as typed: "+92 300…" / "0092…" / "92…" -> "0300…", "300…" -> "0300…". */
export function phoneDigits(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = `0${d.slice(4)}`;
  else if (d.startsWith("92")) d = `0${d.slice(2)}`; // no Pakistani mobile starts with 9, so 92… is the country code
  else if (d.startsWith("3")) d = `0${d}`;
  return d.slice(0, 11);
}

/** "03001234567" -> "0300 1234567" as it is typed. */
export function formatPhone(v) {
  const d = phoneDigits(v);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}

/** "" when fine, else "missing" | "start" | "short". An empty optional number is fine. */
export function phoneProblem(v, { required = false } = {}) {
  const d = phoneDigits(v);
  if (!d) return required ? "missing" : "";
  if (!/^03/.test(d)) return "start";
  if (d.length < 11) return "short";
  return "";
}

export const phoneDigitCount = (v) => phoneDigits(v).length;

export const PHONE_MESSAGES = {
  missing: { en: "Enter the mobile number, like 0300 1234567.", ur: "موبائل نمبر لکھیں، جیسے 0300 1234567۔" },
  start: { en: "A mobile number starts with 03, like 0300 1234567.", ur: "موبائل نمبر 03 سے شروع ہوتا ہے، جیسے 0300 1234567۔" },
  short: { en: "A mobile number has 11 digits, like 0300 1234567.", ur: "موبائل نمبر 11 ہندسوں کا ہوتا ہے، جیسے 0300 1234567۔" },
};
