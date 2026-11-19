/**
 * Seat and gender rule, shared by the seat map, the seats page and the demo API.
 *
 * No seat is reserved for women. A male and a female passenger from DIFFERENT bookings may not sit side by side:
 * neighbouring seats in one row on the same side of the aisle (1-2, 3-4; on the full-width back row every seat
 * and the next: 45-46 ... 48-49). Across the aisle is fine. A mixed
 * pair inside one booking (a family) is allowed. The server enforces the same rule (validate_ticket_seat_neighbours
 * in db/schema.sql), with the same aisle position.
 *
 * Seats here are the UI shape: { id, label, row, col (0-based), deck, status, gender }, where gender is the
 * occupant's ("male" | "female") for a seat someone else has booked, else null.
 */

export const GENDERS = ["female", "male"];

/** Column (0-based) the aisle runs after: after B on a 2+2 coach, after A on a 1+2 coach; -1 = no aisle. */
export function aisleAfter(cols) {
  if (cols === 4) return 1;
  if (cols === 3) return 0;
  if (cols >= 5) return Math.floor(cols / 2) - 1;
  return -1;
}

export const seatCols = (seats) => Math.max(...seats.map((s) => s.col)) + 1;

/**
 * New Khan fleet layouts (db/migrations/2026-11-21-seat-layouts.sql) keep the aisle as an EMPTY column: a normal
 * row has a gap where the aisle is, and the back row is one full-width bench. Such a layout needs no "aisle after"
 * rule: seats in neighbouring columns of a row are side by side, across the aisle they are two columns apart.
 * The same test the database makes (seat_aisle_after).
 */
export function hasGapAisle(seats) {
  const rows = new Map();
  for (const s of seats) {
    const k = `${s.deck ?? 1}:${s.row}`;
    rows.set(k, [...(rows.get(k) ?? []), s.col]);
  }
  for (const cols of rows.values()) if (cols.length < Math.max(...cols) - Math.min(...cols) + 1) return true;
  return false;
}

/** The (0-based) column the aisle runs after, for drawing the gap and the side-by-side rule; -1 = nothing to add. */
export const aisleIndex = (seats) => (seats.length && !hasGapAisle(seats) ? aisleAfter(seatCols(seats)) : -1);

/** Seat labels in number order: 1, 2 ... 10 (old test labels 1A, 1B ... 10A by their number, then letter). */
export const bySeatNumber = (a, b) => {
  const n = (x) => parseInt(String(x), 10);
  const [na, nb] = [n(a), n(b)];
  if (Number.isNaN(na) || Number.isNaN(nb)) return Number.isNaN(na) - Number.isNaN(nb) || String(a).localeCompare(String(b));
  return na - nb || String(a).localeCompare(String(b));
};

/** The seats directly beside this one on the same side of the aisle (none, one or two). */
export function besideSeats(seat, seats) {
  const aisle = aisleIndex(seats);
  return seats.filter(
    (o) => o !== seat && o.row === seat.row && (o.deck ?? 1) === (seat.deck ?? 1) && Math.abs(o.col - seat.col) === 1 && Math.min(o.col, seat.col) !== aisle,
  );
}

/** Genders of passengers from other bookings sitting right beside this seat. */
export function neighbourGenders(seat, seats) {
  return [...new Set(besideSeats(seat, seats).filter((o) => o.status !== "available" && o.gender).map((o) => o.gender))];
}

/** Genders a new booking may put in this seat: any gender not opposite to someone already sitting beside it. */
export function allowedGenders(seat, seats) {
  const next = neighbourGenders(seat, seats);
  return GENDERS.filter((g) => next.every((n) => n === g));
}
