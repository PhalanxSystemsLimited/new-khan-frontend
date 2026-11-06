/** All times in the booking flow are Pakistan Standard Time (Asia/Karachi, UTC+5, no DST). */
export const TZ = "Asia/Karachi";

const parts = (d, opts) =>
  Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", ...opts }).formatToParts(d).map((p) => [p.type, p.value]));

export function todayPKT(now = new Date()) {
  const p = parts(now, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

export function toPktIso(ms) {
  const p = parts(new Date(ms), { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+05:00`;
}

export const isoFor = (date, hhmm) => `${date}T${hhmm}:00+05:00`;

const loc = (lang) => (lang === "ur" ? "ur-PK" : "en-GB");

/** Urdu time of day, said before the time: "صبح 6:00", "رات 8:30". */
export const urDayPart = (h) => (h < 4 ? "رات" : h < 12 ? "صبح" : h < 16 ? "دوپہر" : h < 20 ? "شام" : "رات");

export const fmtTime = (iso, lang) => {
  if (lang === "ur") {
    const p = parts(new Date(iso), { hour: "2-digit", minute: "2-digit" });
    const h = Number(p.hour);
    return `${urDayPart(h)} ${h % 12 === 0 ? 12 : h % 12}:${p.minute}`;
  }
  return new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
};

export const fmtDate = (iso, lang) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** e.g. "Wed, 15 Oct 2026, 9:00 pm PKT" */
export const fmtDateTime = (iso, lang) =>
  lang === "ur"
    ? `${fmtDate(iso, lang)}، ${fmtTime(iso, lang)}`
    : `${new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso))} PKT`;

/** Hour of day in PKT (0-23) for time-of-day filters. */
export const pktHour = (iso) => Number(parts(new Date(iso), { hour: "2-digit" }).hour);

export function hms(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const pkr = (n) => `Rs ${Number(n).toLocaleString("en-US")}`;

/** Add (or subtract) whole days to a YYYY-MM-DD date. */
export function addDaysPKT(date, n) {
  const d = new Date(`${date}T12:00:00+05:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
