import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { arrow } from "../lib/links";
import { bookUrl, useNow } from "./hooks";
import { bt } from "./strings";
import { fmtDate, fmtDateTime, fmtTime, hms, pkr } from "./time";

export const statusBadge = {
  HELD: "bg-amber-100 text-amber-900 border-amber-500",
  CONFIRMED: "bg-green-100 text-green-900 border-green-600",
  EXPIRED: "bg-neutral-200 text-neutral-800 border-neutral-500",
  CANCELLED: "bg-red-100 text-red-900 border-red-500",
};

/**
 * Status tag of a held booking: a live countdown ("⏱ 14:32 left") in place of the word "Held", amber and then
 * red in the last 5 minutes. Calls onZero once when it runs out.
 */
function HoldBadge({ expiresAt, lang }) {
  const now = useNow(1000);
  const left = now === null ? null : Math.max(0, Date.parse(expiresAt) - now);
  const urgent = left !== null && left < 5 * 60_000;
  const time = left === null ? "--:--" : hms(left).replace(/^00:/, "");
  return (
    <span
      role="timer"
      aria-label={`${bt("statusHELD", lang)}: ${bt("timeLeftShort", lang, { time })}`}
      className={`rounded-full border px-3 py-1 text-sm font-bold tabular-nums ${urgent ? "border-red-500 bg-red-100 text-red-900" : statusBadge.HELD}`}
    >
      ⏱ <span className="ltr">{bt("timeLeftShort", lang, { time })}</span>
    </span>
  );
}

/**
 * One booking as a card in a list: reference, status, journey, date, seats, amount, and what to do next.
 * A held booking's tag is its live countdown; `onExpire` runs when it reaches zero (lists reload then).
 * `action` replaces the default links (the mobile-number search opens the booking in place instead).
 */
export function BookingCard({ b, lang, action, onExpire }) {
  // Each state opens under a heading that matches it ("Held, awaiting payment" only for a held booking).
  const held = b.status === "HELD";
  // A held booking is watched second by second; the others only need the clock for nothing, so tick rarely.
  const now = useNow(held ? 1000 : 3_600_000);
  // Its time to pay is over (the server may not have said so yet): never a countdown stuck at 00:00.
  const over = held && Boolean(b.holdExpiresAt) && now !== null && Date.parse(b.holdExpiresAt) <= now;
  // ...unless an online payment was started: the server waits up to 20 more minutes for it.
  const checking = over && b.paymentOpen;
  const expired = b.status === "EXPIRED" || (over && !checking);
  const payable = held && !over;
  const page = expired ? "booking" : ({ CONFIRMED: "confirmed", HELD: "reserved" }[b.status] ?? "booking");
  // The moment the time is up, the list is loaded again (the server expires the booking and frees the seats then),
  // and again every 30 seconds while a payment is still being checked.
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  useEffect(() => {
    if (!over) return undefined;
    expireRef.current?.();
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      if (n > 50) clearInterval(id);
      else expireRef.current?.();
    }, 30_000);
    return () => clearInterval(id);
  }, [over]);
  return (
    <li className="card !p-4 sm:!p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The mobile-number search gives no reference (it is half of what opens a ticket). */}
          {b.ref && <p className="ltr font-mono text-xl font-bold tracking-wider text-black">{b.ref}</p>}
          {b.counterSale && (
            <p className="mt-1">
              <span className="rounded-full border border-black/30 bg-coal px-2 py-0.5 text-xs font-bold text-black">
                {bt("counterSale", lang)}
                {b.customerName && ` · ${b.customerName}`}
              </span>
            </p>
          )}
          <p className="mt-1 font-semibold text-black">
            {b.fromName[lang]} {arrow(lang)} {b.toName[lang]}
          </p>
          <p className="mt-0.5 text-sm text-mute">
            {b.departAt && (
              <>
                {fmtDate(b.departAt, lang)} · <span className="ltr">{fmtTime(b.departAt, lang)}</span>
              </>
            )}
            {b.seats.length > 0 && <> · {bt("seatsList", lang, { list: b.seats.join(", ") })}</>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {checking ? (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${statusBadge.HELD}`}>{bt("checkingPayment", lang)}</span>
          ) : expired ? (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${statusBadge.EXPIRED}`}>{bt("statusEXPIRED", lang)}</span>
          ) : held && b.holdExpiresAt ? (
            <HoldBadge expiresAt={b.holdExpiresAt} lang={lang} />
          ) : (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${statusBadge[b.status] ?? statusBadge.HELD}`}>{bt(`status${b.status}`, lang)}</span>
          )}
          {b.total != null && <span className="ltr font-bold text-black">{pkr(b.total)}</span>}
        </div>
      </div>
      {payable && b.holdExpiresAt && <p className="mt-3 text-sm text-mute">{bt("payBy", lang, { time: fmtDateTime(b.holdExpiresAt, lang) })}</p>}
      {checking && <p role="status" className="mt-3 text-sm text-mute">{bt("checkingPaymentNote", lang)}</p>}
      {expired && !b.paymentReceived && <p className="mt-3 text-sm text-mute">{bt("expiredNowNote", lang)}</p>}
      {/* Paid, but after the hold ended and the seats were taken: say so instead of letting it look lost. */}
      {b.status === "EXPIRED" && b.paymentReceived && (
        <p role="note" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{bt("paymentReview", lang)}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {action ?? (
          <>
            {payable && (
              <Link to={bookUrl(lang, "pay", { ref: b.key })} className="btn btn-gold !min-h-11 !py-2 text-sm">
                {bt("payNow", lang)} · {pkr(b.total)}
              </Link>
            )}
            <Link to={bookUrl(lang, page, { ref: b.key })} className="btn btn-ghost !min-h-11 !py-2 text-sm">
              {bt("viewBooking", lang)}
            </Link>
          </>
        )}
      </div>
    </li>
  );
}
