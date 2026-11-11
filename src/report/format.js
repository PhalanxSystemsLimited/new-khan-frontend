/** Formatting for the Round Trip Report and voucher slips (Pakistan time, whole rupees, 123,456 grouping). */
const TZ = "Asia/Karachi";

/** 186900 → "186,900"; −300 → "−300" (true minus sign). */
export const money = (n) => {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v).toLocaleString("en-US");
  return v < 0 ? `−${s}` : s;
};

/** 259.770 → "259.77"; keeps the decimals that were entered, drops trailing zeros. */
export const plain = (n) => (n === null || n === undefined ? "–" : String(Number(n)));

/** Fixed decimals: 909 → "909.00". */
export const fixed = (n, d = 2) => (n === null || n === undefined ? "—" : Number(n).toFixed(d));

/** "2026-11-03" → "03/11/2026". */
export const dmy = (isoDate) => {
  if (!isoDate) return "—";
  const [y, m, d] = String(isoDate).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const parts = (v) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
      .formatToParts(new Date(v))
      .map((x) => [x.type, x.value]),
  );
  return { ...p, dayPeriod: (p.dayPeriod ?? "").toLowerCase() };
};

/** Departure column: "02-11-2026 10:00 pm". */
export const departure = (v) => {
  if (!v) return "—";
  const p = parts(v);
  return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute} ${p.dayPeriod}`;
};

/** Stamps: "03/11/2026, 4:40 pm". */
export const stamp = (v) => {
  if (!v) return "—";
  const p = parts(v);
  return `${p.day}/${p.month}/${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
};

/** "19:00" → "7:00 pm". */
export const clock = (hhmm) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
