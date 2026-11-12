import { useMemo, useRef, useState } from "react";
import { aisleAfter, seatCols } from "./seatRules";
import { bt } from "./strings";

/**
 * Keyboard-usable seat map, laid out from each seat's row and column (so any coach layout from the backend
 * works). One tab stop (roving tabindex), arrow keys move between seats, Space/Enter taps a seat.
 *
 * Tapping a seat cycles it: free -> female (pink) -> male (blue) -> free. The page decides the next state (it
 * skips a gender the side-by-side rule does not allow) through onCycle. Seats other people booked show their
 * passenger's gender in a paler pink or blue; "blocked" seats (driver, door) leave a gap.
 */
export function SeatMap({ seats, chosen, max, onCycle, notice, lang, legLabel }) {
  const refs = useRef({});
  const { rows, cols, at } = useMemo(() => {
    const rowNums = [...new Set(seats.map((s) => s.row))].sort((a, b) => a - b);
    const map = new Map(seats.map((s) => [`${s.row}:${s.col}`, s]));
    return { rows: rowNums, cols: seatCols(seats), at: (r, c) => map.get(`${r}:${c}`) };
  }, [seats]);
  const aisle = aisleAfter(cols);

  const usable = (s) => s && s.status !== "blocked" && (s.status === "available" || chosen.has(s.id));
  const firstFree = seats.find((s) => s.status === "available")?.id ?? seats[0]?.id;
  const [focus, setFocus] = useState(firstFree);
  const hasUnknown = seats.some((s) => s.status !== "available" && s.status !== "blocked" && !s.gender);

  function onKey(e, s) {
    const d = { ArrowLeft: [0, lang === "ur" ? 1 : -1], ArrowRight: [0, lang === "ur" ? -1 : 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    if (!d) return;
    e.preventDefault();
    let ri = rows.indexOf(s.row);
    let c = s.col;
    for (let k = 0; k < rows.length * cols; k++) {
      ri += d[0];
      c += d[1];
      if (ri < 0 || ri >= rows.length || c < 0 || c >= cols) return;
      const next = at(rows[ri], c);
      if (usable(next)) {
        setFocus(next.id);
        refs.current[next.id]?.focus();
        return;
      }
    }
  }

  /** [classes, label key] for a seat's current look. */
  const look = (s) => {
    const mine = chosen.get(s.id);
    if (mine) return [STYLE[`your-${mine}`], mine === "female" ? "yourFemale" : "yourMale"];
    if (s.status === "available") return [STYLE.available, "available"];
    if (s.gender) return [STYLE[`booked-${s.gender}`], s.gender === "female" ? "bookedFemale" : "bookedMale"];
    return [STYLE.booked, "booked"];
  };

  const legend = [
    [STYLE.available, "available"],
    [STYLE["your-female"], "yourFemale"],
    [STYLE["your-male"], "yourMale"],
    [STYLE["booked-female"], "bookedFemale"],
    [STYLE["booked-male"], "bookedMale"],
    ...(hasUnknown ? [[STYLE.booked, "booked"]] : []),
  ];

  return (
    <div>
      {/* Short rule up front so the seat map stays on screen; the full explanation is one tap away. */}
      <p id={`${legLabel}-hint`} className="text-sm text-mute max-md:sr-only">{bt("seatHintShort", lang)}</p>
      {/* Phones: the same rule as three chips */}
      <ul aria-hidden className="nk-seat-rule md:hidden">
        <li data-g="female">{lang === "ur" ? "1 بار: خاتون" : "1 tap: female"}</li>
        <li data-g="male">{lang === "ur" ? "2 بار: مرد" : "2 taps: male"}</li>
        <li>{lang === "ur" ? "3 بار: خالی" : "3 taps: free"}</li>
      </ul>
      <details className="mt-1 text-sm text-mute">
        <summary className="cursor-pointer font-semibold text-black underline underline-offset-4">{bt("seatHintMore", lang)}</summary>
        <p className="mt-1">{bt("seatHint", lang)}</p>
      </details>
      <ul className="nk-legend mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label={bt("legend", lang)}>
        {legend.map(([c, k]) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className={`h-5 w-5 rounded border-2 ${c}`} />
            {bt(k, lang)}
          </li>
        ))}
      </ul>

      <div role="group" aria-label={`${legLabel}, ${bt("seatsTitle", lang)}`} aria-describedby={`${legLabel}-hint`} className="nk-bus mx-auto mt-4 w-fit rounded-3xl border-2 border-black bg-coal p-4">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-mute">▲ {bt("front", lang)}</p>
        <div className="space-y-2" dir="ltr">
          {rows.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <span aria-hidden className="w-5 text-center text-xs text-mute">{r}</span>
              {Array.from({ length: cols }, (_, c) => {
                const s = at(r, c);
                const gap = c === aisle + 1 ? "ms-6" : "";
                if (!s || s.status === "blocked") return <span key={c} aria-hidden className={`h-11 w-11 ${gap}`} />;
                const mine = chosen.get(s.id);
                const disabled = s.status !== "available" && !mine;
                const shown = mine ?? (s.status !== "available" ? s.gender : null);
                const name = s.label ?? s.id;
                const [cls, stateKey] = look(s);
                return (
                  <span key={s.id} className={gap}>
                    <button
                      ref={(el) => (refs.current[s.id] = el)}
                      type="button"
                      tabIndex={s.id === focus ? 0 : -1}
                      disabled={disabled}
                      aria-label={`${bt("seatWord", lang, { id: name })}, ${bt(stateKey, lang)}`}
                      onFocus={() => setFocus(s.id)}
                      onKeyDown={(e) => onKey(e, s)}
                      onClick={() => onCycle(s.id)}
                      className={`relative h-11 w-11 rounded-lg border-2 text-xs font-bold ${cls} disabled:cursor-not-allowed`}
                    >
                      {name}
                      {shown && (
                        <span aria-hidden className={`absolute -right-1.5 -top-2 text-[12px] leading-none ${mine ? "text-gold" : shown === "female" ? "text-pink-300" : "text-blue-300"}`}>
                          {shown === "female" ? "♀" : "♂"}
                        </span>
                      )}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-black" aria-live="polite">{bt("seatsPicked", lang, { x: chosen.size, n: max })}</p>
      {/* Phones: the seats picked so far, as chips */}
      {chosen.size > 0 && (
        <ul aria-hidden className="nk-picked md:hidden">
          {seats
            .filter((s) => chosen.has(s.id))
            .map((s) => (
              <li key={s.id} data-g={chosen.get(s.id)}>
                {s.label ?? s.id} · {bt(chosen.get(s.id), lang)}
              </li>
            ))}
        </ul>
      )}
      <p role="status" aria-live="polite" className={notice ? "mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-center text-sm text-amber-900" : "sr-only"}>
        {notice}
      </p>
    </div>
  );
}

/** Your own picks are strong pink / blue with a gold edge; seats other people booked are paler. */
const STYLE = {
  available: "border-black bg-white text-black hover:bg-gold/20",
  "your-female": "border-gold bg-pink-500 text-white",
  "your-male": "border-gold bg-blue-600 text-white",
  "booked-female": "border-pink-300 bg-pink-200 text-pink-900",
  "booked-male": "border-blue-300 bg-blue-200 text-blue-900",
  booked: "border-neutral-400 bg-neutral-300 text-neutral-500",
};
