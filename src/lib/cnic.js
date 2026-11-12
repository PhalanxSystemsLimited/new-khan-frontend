/**
 * CNIC helpers shared by the booking form, the counter sale and the conductor screen.
 * Same rules as the backend (utils/schemas.js `cnic`): 13 digits, and no obviously made-up numbers.
 */
export const cnicDigits = (v) => String(v ?? "").replace(/\D/g, "");

/** 3520212345671 -> 35202-1234567-1 as it is typed. */
export const formatCnic = (v) => {
  const d = cnicDigits(v).slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

/** One digit repeated, a leading 0 (no province code starts with 0), or a straight run like 12345-6789012-3. */
export function cnicLooksFake(v) {
  const d = cnicDigits(v);
  if (d.length !== 13) return false;
  if (/^(\d)\1{12}$/.test(d)) return true;
  if (d[0] === "0") return true;
  return "1234567890123456789".includes(d) || "9876543210987654321".includes(d);
}

/** "" when fine, else "missing" | "format" | "fake". */
export function cnicProblem(v) {
  const s = String(v ?? "").trim();
  if (!s) return "missing";
  if (!/^\d{5}-?\d{7}-?\d$/.test(s)) return "format";
  if (cnicLooksFake(s)) return "fake";
  return "";
}

export const CNIC_MESSAGES = {
  missing: { en: "Enter the CNIC (13 digits, like 35202-1234567-1).", ur: "شناختی کارڈ نمبر لکھیں (13 ہندسے، جیسے 35202-1234567-1)۔" },
  format: { en: "A CNIC has 13 digits, like 35202-1234567-1.", ur: "شناختی کارڈ نمبر 13 ہندسوں کا ہوتا ہے، جیسے 35202-1234567-1۔" },
  fake: { en: "This CNIC number is not valid. Please check it.", ur: "یہ شناختی کارڈ نمبر درست نہیں ہے۔ براہِ کرم چیک کریں۔" },
};
