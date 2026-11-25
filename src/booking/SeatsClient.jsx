import { toast } from "../components/Toast";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { busTypes } from "../data/site";
import { arrow } from "../lib/links";
import { checkPromo, createBooking, getSeats, getTrip, IS_LIVE, PROMO_ON } from "./api";
import { getSession } from "./auth";
import { AuthDialog } from "./AuthDialog";
import { PhoneVerifyDialog } from "./PhoneVerifyDialog";
import { PhoneInput } from "../components/PatternFields";
import { CNIC_MESSAGES, cnicProblem, formatCnic } from "../lib/cnic";
import { formatPhone } from "../lib/phone";
import { ApiError } from "./errors";
import { bookUrl } from "./hooks";
import { SeatMap } from "./SeatMap";
import { allowedGenders } from "./seatRules";
import { isStaffRole, refreshMe, useMe } from "./useRole";
import { bt } from "./strings";
import { fmtDate, fmtTime, pkr } from "./time";

/* ---- client-side validation (helps the customer; the backend re-validates everything) ---- */
const phoneOk = (v) => /^(?:\+92|0092|92|0)?3\d{9}$/.test(v.replace(/[\s-]/g, ""));
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const nameOk = (v) => v.trim().length >= 2 && /^[\p{L}\p{M} .'-]+$/u.test(v.trim());

const checks = {
  name: [nameOk, "errName"],
  phone: [phoneOk, "errPhone"],
};
// Gender is not typed in: it comes from the seat (one tap = female, two taps = male).
// No CNIC per passenger: the booking holder's CNIC (below the passengers) is the one that counts.
const FIELDS = ["name", "phone"];
const star = IS_LIVE ? "" : "*";
/** Tapping a seat goes free -> female -> male -> free. */
const CYCLE = [null, "female", "male"];

/**
 * Each leg's picks are "slots", one per passenger: slot i is { id, gender } or null. A new pick fills the first
 * empty slot, so freeing and re-picking a seat never moves a passenger's name to someone else's seat.
 * On the first bus, slot i is passenger i. On later buses (a connection or the return) passengers are matched
 * by gender: the k-th woman on the first bus takes the k-th woman's seat picked on that bus.
 */
const emptySlots = (n) => Array.from({ length: n }, () => null);
const picksOf = (slots) => slots.filter(Boolean);

export function SeatsClient({ lang }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  // out / ret are comma-separated trip ids: one bus, or two buses joined by a layover in Lahore.
  const outIds = (sp.get("out") ?? "").split(",").filter(Boolean);
  const retIds = (sp.get("ret") ?? "").split(",").filter(Boolean);
  const outKey = outIds.join(",");
  const retKey = retIds.join(",");
  const pax = Math.min(6, Math.max(1, Number(sp.get("pax") ?? 1)));

  const [legs, setLegs] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [pass, setPass] = useState(() => Array.from({ length: pax }, () => ({ name: "", phone: "" })));
  const [notices, setNotices] = useState({});
  const [email, setEmail] = useState("");
  // Booking holder's CNIC: filled in from the account; staff type the walk-in customer's.
  const me = useMe();
  const staff = isStaffRole(me?.role);
  // A customer's bookings always carry their account's CNIC (locked); an account without one is asked once and
  // it is saved to the account. Staff type the walk-in customer's CNIC.
  const accountCnic = !staff && me?.cnic ? formatCnic(me.cnic) : "";
  const cnicLocked = Boolean(accountCnic);
  const [typedCnic, setTypedCnic] = useState("");
  const holderCnic = cnicLocked ? accountCnic : typedCnic;
  const savesToAccount = IS_LIVE && me && !staff && !cnicLocked;
  // One name and number for the whole booking (passenger 1's) unless "a separate name and number for each
  // passenger" is ticked: then every seat has its own, as before.
  const [each, setEach] = useState(false);
  const shown = (i) => i === 0 || each;
  // A customer's own name, number and email are filled in from the account once (still editable); staff type the
  // walk-in customer's.
  const filled = useRef(false);
  useEffect(() => {
    if (!me || staff || filled.current) return;
    filled.current = true;
    setPass((ps) => ps.map((p, i) => (i === 0 ? { name: p.name || me.fullName || "", phone: p.phone || formatPhone(me.phone ?? "") } : p)));
    setEmail((e) => e || me.email || "");
  }, [me, staff]);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  // Promo code (online customers only): what is typed, the code the server accepted with its discount, and why not.
  const [promoText, setPromoText] = useState("");
  const [promo, setPromo] = useState(null); // { code, subtotal, discount, total } once applied
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoErr, setPromoErr] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false); // "verify your mobile" (only when SMS is set up)
  const summaryRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoadErr("");
      const ids = [...outKey.split(","), ...retKey.split(",")].filter(Boolean);
      if (!ids.length) throw new ApiError("INVALID_INPUT", "No trip selected.");
      const res = await Promise.all(ids.map(async (id) => ({ trip: await getTrip(id), seats: await getSeats(id) })));
      // Keep a pick only while its seat is still free and its gender is still allowed beside the new neighbours.
      const keep = (seats, p) => {
        const s = p && seats.find((x) => x.id === p.id);
        return s?.status === "available" && allowedGenders(s, seats).includes(p.gender) ? p : null;
      };
      setLegs((prev) => res.map((r, i) => ({ ...r, picked: (prev?.[i]?.picked ?? emptySlots(pax)).map((p) => keep(r.seats, p)) })));
    } catch (e) {
      setLoadErr(e.message);
    }
  }, [outKey, retKey, pax]);
  useEffect(() => {
    load();
  }, [load]);

  // Keeps the map current while the customer chooses: every 30 seconds, and when they come back to the tab, the seats
  // are fetched again quietly. Seats others just took turn grey; a seat this customer had picked that is gone is
  // unpicked with a note. Not while a booking is being sent; a failed refresh just keeps the map as it is.
  const busyRef = useRef(false);
  busyRef.current = busy;
  const legsRef = useRef(null);
  legsRef.current = legs;
  const refreshSeq = useRef(0);
  const lastRefresh = useRef(Date.now());
  const refreshSeats = useCallback(async () => {
    if (busyRef.current || document.visibilityState === "hidden") return;
    if (Date.now() - lastRefresh.current < 5_000) return; // "tab visible" and "window focus" often come together
    lastRefresh.current = Date.now();
    const ids = [...outKey.split(","), ...retKey.split(",")].filter(Boolean);
    if (!ids.length) return;
    const n = ++refreshSeq.current;
    let fresh;
    try {
      fresh = await Promise.all(ids.map((id) => getSeats(id)));
    } catch {
      return;
    }
    if (n !== refreshSeq.current || busyRef.current) return; // a newer refresh, or a booking started meanwhile
    // Picks still free (and allowed beside the new neighbours) stay; the others are unpicked and named in `gone`.
    const apply = (ls, gone) =>
      ls.map((l, i) => {
        const seats = fresh[i];
        const picked = l.picked.map((p) => {
          const s = p && seats.find((x) => x.id === p.id);
          if (!p || (s?.status === "available" && allowedGenders(s, seats).includes(p.gender))) return p;
          if (gone) (gone[i] ??= []).push(l.seats.find((x) => x.id === p.id)?.label ?? p.id);
          return null;
        });
        return { ...l, seats, picked };
      });
    const base = legsRef.current;
    if (!base || base.length !== fresh.length) return;
    const gone = {}; // leg -> seat names unpicked
    const next = apply(base, gone);
    // A tap that is not on screen yet is kept: it is checked against the fresh seats the same way.
    setLegs((prev) => (prev === base ? next : prev && prev.length === fresh.length ? apply(prev, null) : prev));
    const legsGone = Object.keys(gone);
    if (legsGone.length) {
      setNotices((old) => {
        const out = { ...old };
        for (const i of legsGone) out[i] = gone[i].map((seat) => bt("seatJustGone", lang, { seat })).join(" ");
        return out;
      });
    }
  }, [outKey, retKey, lang]);
  useEffect(() => {
    if (!legs) return undefined;
    const t = setInterval(refreshSeats, 30_000);
    const onBack = () => {
      if (document.visibilityState === "visible") refreshSeats();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [Boolean(legs), refreshSeats]); // eslint-disable-line react-hooks/exhaustive-deps

  /** One tap on a seat: free -> female -> male -> free, skipping a gender the side-by-side rule does not allow. */
  function cycle(leg, id) {
    const l = legs[leg];
    const seat = l.seats.find((s) => s.id === id);
    const slot = l.picked.findIndex((p) => p?.id === id);
    const current = slot >= 0 ? l.picked[slot].gender : null;
    const ok = allowedGenders(seat, l.seats);
    const name = seat.label ?? id;
    const say = (key) => setNotices((n) => ({ ...n, [leg]: key ? bt(key, lang, { seat: name, n: pax }) : "" }));

    let next = current;
    for (let k = 1; k <= CYCLE.length; k++) {
      const g = CYCLE[(CYCLE.indexOf(current) + k) % CYCLE.length];
      if (g === null || ok.includes(g)) {
        next = g;
        break;
      }
    }
    if (current === null && next === null) return say("seatBlockedMixed"); // a man on one side, a woman on the other
    if (current === null && slot < 0 && !l.picked.includes(null)) return say("seatLimit");

    setLegs((ls) =>
      ls.map((x, i) => {
        if (i !== leg) return x;
        const picked = [...x.picked];
        if (slot >= 0) picked[slot] = next ? { id, gender: next } : null;
        else picked[picked.indexOf(null)] = { id, gender: next };
        return { ...x, picked };
      }),
    );
    // Explain why a gender was skipped (or will be on the next tap).
    say(ok.length === 1 ? (ok[0] === "male" ? "onlyMaleHere" : "onlyFemaleHere") : null);
  }

  const groupOf = (i) => (i < outIds.length ? 0 : 1);
  const legName = (l, i) => {
    const g = groupOf(i);
    const n = g === 0 ? outIds.length : retIds.length;
    const k = g === 0 ? i + 1 : i - outIds.length + 1;
    const head = retIds.length || n > 1 ? (g === 0 ? bt("outbound", lang) : bt("returnLeg", lang)) : "";
    const part = n > 1 ? bt("legOf", lang, { k, n }) : "";
    return `${[head, part].filter(Boolean).join(" · ")}${head || part ? ": " : ""}${l.trip.fromName[lang]} ${arrow(lang)} ${l.trip.toName[lang]}`;
  };
  const seatName = (l, id) => l.seats.find((s) => s.id === id)?.label ?? id;

  // Passenger i's gender comes from their seat on the first bus.
  const genders = legs ? legs[0].picked.map((p) => p?.gender ?? null) : [];
  /** Passenger i's seat id on leg `li`, or undefined while it is not picked yet. */
  const seatFor = (li, i) => {
    const l = legs[li];
    if (li === 0) return l.picked[i]?.id;
    const g = genders[i];
    if (!g) return undefined;
    const rank = genders.slice(0, i).filter((x) => x === g).length;
    return picksOf(l.picked).filter((p) => p.gender === g)[rank]?.id;
  };
  const countOf = (slots, g) => picksOf(slots).filter((p) => p.gender === g).length;

  const errFor = (i, f) => {
    const [ok, key] = checks[f];
    return ok(pass[i][f] ?? "") ? "" : bt(key, lang);
  };
  const emailErr = emailOk(email) ? "" : bt("errEmail", lang);
  // Required: one CNIC per booking (the holder's; a family travels on one CNIC).
  const cnicIssue = cnicProblem(holderCnic);
  const holderCnicErr = cnicIssue ? CNIC_MESSAGES[cnicIssue][lang] : "";
  const show = (k) => submitted || touched[k];
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }));

  // Every bus needs one seat per passenger, and later buses the same number of female and male seats as the first.
  const seatErrors = legs
    ? legs.map((l, i) => {
        if (picksOf(l.picked).length !== pax) return bt("errSeats", lang, { n: pax, leg: legName(l, i) });
        const f = countOf(legs[0].picked, "female");
        if (i > 0 && countOf(l.picked, "female") !== f) return bt("errLegGenders", lang, { leg: legName(l, i), f, m: pax - f });
        return "";
      })
    : [];
  const anyError = seatErrors.some(Boolean) || pass.some((_, i) => shown(i) && FIELDS.some((f) => errFor(i, f))) || !!emailErr || !!holderCnicErr;

  /** "Apply": the server works out the discount for these seats on the first bus; nothing is reserved yet. */
  async function applyPromo(e) {
    e?.preventDefault();
    const code = promoText.trim().toUpperCase();
    setPromoErr("");
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return setPromoErr(bt("promoFormat", lang));
    if (!getSession()) {
      setPromoErr(bt("promoSignIn", lang));
      setAuthOpen(true);
      return;
    }
    setPromoBusy(true);
    try {
      setPromo(await checkPromo({ tripId: legs[0].trip.id, seats: pax, code }));
      setPromoText(code);
    } catch (err) {
      setPromo(null);
      // The server's own reason (expired, already used, not for this route, minimum amount...).
      setPromoErr(err instanceof ApiError && err.code === "RATE_LIMITED" ? bt("rateLimited", lang) : err?.message || bt("promoBad", lang));
    }
    setPromoBusy(false);
  }
  const removePromo = () => {
    setPromo(null);
    setPromoText("");
    setPromoErr("");
  };

  async function reserve() {
    if (busy) return; // a second click while the first is on its way
    setSubmitted(true);
    setBanner("");
    if (anyError || !legs) {
      setBanner(bt("fixErrors", lang));
      summaryRef.current?.focus();
      return;
    }
    if (IS_LIVE && !getSession()) {
      setBanner(bt("signInToBook", lang));
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    try {
      const r = await createBooking({
        legs: legs.map((l, li) => ({ tripId: l.trip.id, seats: pass.map((_, i) => seatFor(li, i)), group: groupOf(li) })),
        // Seats without their own details carry the booking's name and number.
        passengers: pass.map((p, i) => ({ name: (shown(i) ? p : pass[0]).name.trim(), phone: (shown(i) ? p : pass[0]).phone.trim(), gender: genders[i] })),
        contactEmail: email.trim(),
        holderCnic: formatCnic(holderCnic),
        promoCode: promo?.code, // checked again by the server when the booking is made
      });
      if (savesToAccount) refreshMe(); // the account now has this CNIC
      toast(bt("toastReserved", lang), { body: bt("toastReservedBody", lang) });
      // Nothing to pay (a promo code covered the fare): straight to the confirmed ticket.
      navigate(bookUrl(lang, r.confirmed ? "confirmed" : "reserved", { ref: r.refs.join(",") }));
    } catch (e) {
      if (e instanceof ApiError && (e.code === "SEAT_TAKEN" || e.code === "SEAT_GENDER")) {
        setBanner(bt(e.code === "SEAT_GENDER" ? "seatGenderConflict" : "seatTaken", lang));
        await load(); // refresh the map; conflicting picks are dropped
      } else if (e instanceof ApiError && e.code === "PHONE_NOT_VERIFIED") {
        // SMS is set up: the contact mobile (first passenger's) must be verified once, then booking continues.
        setBusy(false);
        setPhoneOpen(true);
        return;
      } else if (e instanceof ApiError && e.code === "CNIC_REQUIRED") {
        setTouched((t) => ({ ...t, holderCnic: true }));
        setBanner(e.message);
      } else if (e instanceof ApiError && e.code === "AUTH_REQUIRED") {
        setBanner(bt("signInToBook", lang));
        setAuthOpen(true);
      } else if (e instanceof ApiError && e.code === "TOO_MANY_PENDING") {
        setBanner(bt("tooManyPending", lang));
      } else if (e instanceof ApiError && e.code === "RATE_LIMITED") {
        setBanner(bt("rateLimited", lang));
      } else if (e instanceof ApiError && e.code === "RETRY") {
        setBanner(bt("systemBusy", lang));
      } else {
        // The server's own reason when it gave one (a closed terminal, a counter rule), else the general message.
        setBanner(e instanceof ApiError && ["INVALID_INPUT", "NOT_YOUR_TERMINAL"].includes(e.code) && e.message ? e.message : bt("reserveFailed", lang));
      }
      setBusy(false);
      summaryRef.current?.focus();
    }
  }

  if (loadErr)
    return (
      <div role="alert" className="card mt-6">
        <p className="font-semibold text-red-800">{bt("loadFailed", lang)}</p>
        <p className="mt-1 text-sm text-mute">{loadErr}</p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={load} className="btn btn-ghost">{bt("retry", lang)}</button>
          <Link to={`/${lang}/book`} className="btn btn-gold">{bt("searchAgain", lang)}</Link>
        </div>
      </div>
    );
  if (!legs) return <p role="status" className="mt-6 text-mute">{bt("loading", lang)}</p>;

  const total = legs.reduce((a, l) => a + l.trip.fare * pax, 0);
  const promoOn = PROMO_ON && !staff; // promotions are for online customers, not counter sales
  const discount = promoOn && promo ? Math.min(Number(promo.discount) || 0, total) : 0;
  const toPay = Math.max(0, total - discount);

  return (
    <div className="pb-28">
      <div ref={summaryRef} tabIndex={-1} className="outline-none" aria-live="assertive">
        {banner && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-900">{banner}</p>}
      </div>

      {legs.map((l, i) => {
        const bus = busTypes.find((b) => b.id === l.trip.busType) ?? busTypes[0];
        return (
          <section key={l.trip.id} className="card mt-6" aria-labelledby={`leg-${i}`}>
            <h2 id={`leg-${i}`} className="h3 text-black">{legName(l, i)}</h2>
            <p className="mt-1 text-sm text-mute">
              {fmtDate(l.trip.departAt, lang)} · <span className={lang === "ur" ? "" : "ltr"}>{fmtTime(l.trip.departAt, lang)}</span> · {bus.name[lang]} · <span className="ltr">{pkr(l.trip.fare)}{star}</span> {bt("perSeat", lang)}
            </p>
            <p className="mt-3 font-semibold text-black">{bt("chooseSeats", lang, { n: pax })}</p>
            <div className="mt-3">
              <SeatMap
                seats={l.seats}
                chosen={new Map(picksOf(l.picked).map((p) => [p.id, p.gender]))}
                max={pax}
                onCycle={(id) => cycle(i, id)}
                notice={notices[i]}
                lang={lang}
                legLabel={`leg${i}`}
              />
            </div>
            {submitted && seatErrors[i] && <p role="alert" className="mt-3 text-sm text-red-700">{seatErrors[i]}</p>}
          </section>
        );
      })}

      <section className="card mt-6" aria-labelledby="pax-h">
        <h2 id="pax-h" className="h3 text-black">{bt(pax > 1 && !each ? "bookingDetails" : "passengerDetails", lang)}</h2>
        {pass.map((p, i) => !shown(i) ? null : (
          <Fragment key={i}>
          <fieldset data-g={genders[i] || undefined} className="nk-pax mt-5 border-t border-line pt-4 first:mt-3 first:border-0 first:pt-0">
            <legend className="font-semibold text-black">
              {pax > 1 && !each ? (
                <>
                  {bt("bookingContact", lang)}
                  <span className="ms-2 text-sm font-normal text-mute">({bt("allTicketsNote", lang, { n: pax })})</span>
                </>
              ) : (
              <>
              {bt("passengerN", lang, { n: i + 1 })}
              {genders[i] ? (
                <>
                  <span className={`ms-2 rounded-full px-2 py-0.5 text-xs font-bold text-white ${genders[i] === "female" ? "bg-pink-500" : "bg-blue-600"}`}>
                    {bt(genders[i], lang)}
                  </span>
                  <span className="ms-2 text-sm font-normal text-mute">
                    ({legs.map((l, li) => (seatFor(li, i) ? seatName(l, seatFor(li, i)) : "–")).join(" / ")})
                  </span>
                </>
              ) : (
                <span className="ms-2 text-sm font-normal text-mute">({bt("pickSeatFirst", lang)})</span>
              )}
              </>
              )}
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1.4fr]">
              {FIELDS.map((f) => {
                const key = `${i}-${f}`;
                const e = show(key) ? errFor(i, f) : "";
                const label = bt(f === "name" ? "fullName" : f, lang);
                const update = (v) => setPass((ps) => ps.map((x, j) => (j === i ? { ...x, [f]: v } : x)));
                return (
                  <div key={f} className="nk-mfield">
                    <label htmlFor={`p-${key}`} className="label">{label}</label>
                    {f === "phone" ? (
                      // Formats as typed (0300 1234567, stops at 11 digits); the message below is this form's own.
                      <PhoneInput
                        id={`p-${key}`}
                        className="field"
                        lang={lang}
                        value={p[f] ?? ""}
                        messages={false}
                        aria-invalid={!!e}
                        describedBy={e ? `e-${key}` : undefined}
                        onBlur={() => blur(key)}
                        onChange={(x) => update(x)}
                      />
                    ) : (
                      <input
                        id={`p-${key}`}
                        className="field"
                        value={p[f] ?? ""}
                        inputMode={f === "name" ? "text" : "numeric"}
                        autoComplete={f === "name" ? "name" : f === "phone" ? "tel" : "off"}
                        aria-invalid={!!e}
                        aria-describedby={e ? `e-${key}` : undefined}
                        onBlur={() => blur(key)}
                        onChange={(ev) => update(ev.target.value)}
                      />
                    )}
                    {e && <p id={`e-${key}`} role="alert" className="mt-1 text-sm text-red-700">{e}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
          {i === 0 && pax > 1 && (
            <label htmlFor="each-pax" className="mt-4 flex cursor-pointer items-start gap-3 text-black">
              <input id="each-pax" type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-black" checked={each} onChange={(e) => setEach(e.target.checked)} />
              <span>{bt("eachPassenger", lang)}</span>
            </label>
          )}
          </Fragment>
        ))}

        <div className="mt-6 border-t border-line pt-4">
          <div className="nk-mfield">
            <label htmlFor="contact-email" className="label">{bt("contactEmail", lang)}</label>
            <input
              id="contact-email"
              type="email"
              className="field ltr sm:max-w-md"
              autoComplete="email"
              value={email}
              aria-invalid={show("email") && !!emailErr}
              aria-describedby={show("email") && emailErr ? "e-email" : undefined}
              onBlur={() => blur("email")}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {show("email") && emailErr && <p id="e-email" role="alert" className="mt-1 text-sm text-red-700">{emailErr}</p>}
        </div>

        <div className="mt-5">
          <div className="nk-mfield">
          <label htmlFor="holder-cnic" className="label">{bt(staff ? "holderCnicStaff" : "holderCnic", lang)}</label>
          <input
            id="holder-cnic"
            className="field ltr sm:max-w-xs"
            inputMode="numeric"
            autoComplete="off"
            placeholder="35202-1234567-1"
            value={holderCnic}
            readOnly={cnicLocked}
            aria-readonly={cnicLocked}
            aria-invalid={show("holderCnic") && !!holderCnicErr}
            required
            aria-describedby="holder-cnic-hint"
            onBlur={() => blur("holderCnic")}
            onChange={(e) => setTypedCnic(formatCnic(e.target.value))}
            style={cnicLocked ? { backgroundColor: "#f3f4f6" } : undefined}
          />
          </div>
          <p id="holder-cnic-hint" className="mt-1 text-sm text-mute">
            {bt(cnicLocked ? "holderCnicLocked" : savesToAccount ? "holderCnicFirst" : "holderCnicHint", lang)}
          </p>
          {show("holderCnic") && holderCnicErr && <p role="alert" className="mt-1 text-sm text-red-700">{holderCnicErr}</p>}
        </div>
      </section>

      {promoOn && (
        <section className="card mt-4" aria-labelledby="promo-h">
          <h2 id="promo-h" className="h3 text-black">{bt("promoTitle", lang)}</h2>
          {promo ? (
            <>
              <p role="status" className="mt-3 rounded-xl border border-green-600 bg-green-50 p-3 font-semibold text-green-900">
                {bt("promoApplied", lang, { code: promo.code, amount: pkr(discount) })}{" "}
                <button type="button" onClick={removePromo} className="ms-1 font-semibold underline underline-offset-4">{bt("promoRemove", lang)}</button>
              </p>
              <dl className="mt-3 grid max-w-sm gap-1 text-sm">
                <div className="flex justify-between"><dt className="text-mute">{bt("fareLine", lang)}</dt><dd className="ltr text-black">{pkr(total)}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">{bt("discountLine", lang)}</dt><dd className="ltr text-green-800">− {pkr(discount)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1 font-bold"><dt className="text-black">{bt("toPay", lang)}</dt><dd className="ltr text-black">{pkr(toPay)}</dd></div>
              </dl>
              {legs.length > 1 && <p className="mt-2 text-xs text-mute">{bt("promoReturnNote", lang)}</p>}
              {toPay === 0 && <p className="mt-2 text-sm font-semibold text-black">{bt("nothingToPay", lang)}</p>}
            </>
          ) : (
            <form onSubmit={applyPromo} noValidate className="mt-3">
              <label htmlFor="f-promo" className="text-sm text-mute">{bt("promoHint", lang)}</label>
              <div className="mt-2 flex max-w-sm gap-2">
                <input
                  id="f-promo"
                  className="field ltr uppercase"
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={30}
                  value={promoText}
                  aria-invalid={!!promoErr}
                  aria-describedby={promoErr ? "e-promo" : undefined}
                  onChange={(e) => { setPromoText(e.target.value); setPromoErr(""); }}
                />
                <button type="submit" disabled={promoBusy || !promoText.trim()} className="btn btn-ghost shrink-0 disabled:opacity-50">{promoBusy ? bt("promoChecking", lang) : bt("promoApply", lang)}</button>
              </div>
              {promoErr && <p id="e-promo" role="alert" className="mt-2 text-sm text-red-700">{promoErr}</p>}
            </form>
          )}
        </section>
      )}

      <aside className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-gold bg-white/97 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur">
        <div className="container-nk">
          <p className="truncate text-xs text-mute sm:whitespace-normal">{bt(IS_LIVE ? "reserveNoteLive" : "reserveNote", lang)}</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="ltr whitespace-nowrap text-lg font-bold text-black sm:text-xl">
              <span className="nk-total-k">
                {bt("total", lang)}
                <span className="md:hidden"> · {pax} {lang === "ur" ? "سیٹیں" : pax === 1 ? "seat" : "seats"}</span>
              </span>{" "}
              {discount > 0 && <s className="me-2 text-sm font-normal text-mute">{pkr(total)}</s>}
              {pkr(toPay)}<sup>{star}</sup>
            </p>
            {/* Always clickable: validation happens on click and moves focus to the message */}
            <button type="button" onClick={reserve} disabled={busy} aria-busy={busy} className="btn btn-gold btn-shine shrink-0 whitespace-nowrap disabled:opacity-60">{busy ? bt("reserving", lang) : bt("reserve", lang)}</button>
          </div>
        </div>
      </aside>

      {IS_LIVE && <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={reserve} />}
      {IS_LIVE && (
        <PhoneVerifyDialog
          lang={lang}
          phone={pass[0]?.phone?.trim() ?? ""}
          open={phoneOpen}
          onClose={() => setPhoneOpen(false)}
          onVerified={() => { setPhoneOpen(false); reserve(); }}
        />
      )}
    </div>
  );
}
