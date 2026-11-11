import { toast } from "../components/Toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { busTypes } from "../data/site";
import { arrow } from "../lib/links";
import { createBooking, getSeats, getTrip, IS_LIVE } from "./api";
import { getSession } from "./auth";
import { AuthDialog } from "./AuthDialog";
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
const cnicDigits = (v) => (v ?? "").replace(/\D/g, "");
const holderCnicOk = (v) => /^\d{5}-?\d{7}-?\d$/.test((v ?? "").trim());
/** 3520212345671 -> 35202-1234567-1 as the customer types. */
const formatCnic = (v) => {
  const d = cnicDigits(v).slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};
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
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
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
  // Optional: only checked when something is typed.
  const holderCnicErr = !(holderCnic ?? "").trim() || holderCnicOk(holderCnic) ? "" : bt("errHolderCnic", lang);
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
  const anyError = seatErrors.some(Boolean) || pass.some((_, i) => FIELDS.some((f) => errFor(i, f))) || !!emailErr || !!holderCnicErr;

  async function reserve() {
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
        passengers: pass.map((p, i) => ({ name: p.name.trim(), phone: p.phone.trim(), gender: genders[i] })),
        contactEmail: email.trim(),
        holderCnic: (holderCnic ?? "").trim() ? formatCnic(holderCnic) : undefined,
      });
      if (savesToAccount) refreshMe(); // the account now has this CNIC
      toast(bt("toastReserved", lang), { body: bt("toastReservedBody", lang) });
      navigate(bookUrl(lang, "reserved", { ref: r.refs.join(",") }));
    } catch (e) {
      if (e instanceof ApiError && (e.code === "SEAT_TAKEN" || e.code === "SEAT_GENDER")) {
        setBanner(bt(e.code === "SEAT_GENDER" ? "seatGenderConflict" : "seatTaken", lang));
        await load(); // refresh the map; conflicting picks are dropped
      } else if (e instanceof ApiError && e.code === "AUTH_REQUIRED") {
        setBanner(bt("signInToBook", lang));
        setAuthOpen(true);
      } else {
        setBanner(e instanceof ApiError && e.code === "INVALID_INPUT" ? e.message : bt("reserveFailed", lang));
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
        <h2 id="pax-h" className="h3 text-black">{bt("passengerDetails", lang)}</h2>
        {pass.map((p, i) => (
          <fieldset key={i} className="mt-5 border-t border-line pt-4 first:mt-3 first:border-0 first:pt-0">
            <legend className="font-semibold text-black">
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
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1.4fr]">
              {FIELDS.map((f) => {
                const key = `${i}-${f}`;
                const e = show(key) ? errFor(i, f) : "";
                const label = bt(f === "name" ? "fullName" : f, lang);
                const update = (v) => setPass((ps) => ps.map((x, j) => (j === i ? { ...x, [f]: v } : x)));
                return (
                  <div key={f}>
                    <label htmlFor={`p-${key}`} className="label">{label}</label>
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
                    {e && <p id={`e-${key}`} role="alert" className="mt-1 text-sm text-red-700">{e}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="mt-6 border-t border-line pt-4">
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
          {show("email") && emailErr && <p id="e-email" role="alert" className="mt-1 text-sm text-red-700">{emailErr}</p>}
        </div>

        <div className="mt-5">
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
            aria-describedby="holder-cnic-hint"
            onBlur={() => blur("holderCnic")}
            onChange={(e) => setTypedCnic(formatCnic(e.target.value))}
            style={cnicLocked ? { backgroundColor: "#f3f4f6" } : undefined}
          />
          <p id="holder-cnic-hint" className="mt-1 text-sm text-mute">
            {bt(cnicLocked ? "holderCnicLocked" : savesToAccount ? "holderCnicFirst" : "holderCnicHint", lang)}
          </p>
          {show("holderCnic") && holderCnicErr && <p role="alert" className="mt-1 text-sm text-red-700">{holderCnicErr}</p>}
        </div>
      </section>

      <aside className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-gold bg-white/97 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur">
        <div className="container-nk">
          <p className="truncate text-xs text-mute sm:whitespace-normal">{bt(IS_LIVE ? "reserveNoteLive" : "reserveNote", lang)}</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="ltr whitespace-nowrap text-lg font-bold text-black sm:text-xl">{bt("total", lang)} {pkr(total)}<sup>{star}</sup></p>
            {/* Always clickable: validation happens on click and moves focus to the message */}
            <button type="button" onClick={reserve} aria-busy={busy} className="btn btn-gold btn-shine shrink-0 whitespace-nowrap">{busy ? bt("reserving", lang) : bt("reserve", lang)}</button>
          </div>
        </div>
      </aside>

      {IS_LIVE && <AuthDialog lang={lang} open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={reserve} />}
    </div>
  );
}
