/**
 * Seat and gender rule, shared by the seat map, the seats page and the demo API.
 *
 * No seat is reserved for women. A male and a female passenger from DIFFERENT bookings may not sit side by side:
 * neighbouring seats in one row on the same side of the aisle (1A-1B, 1C-1D). Across the aisle is fine. A mixed
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

/** The seats directly beside this one on the same side of the aisle (none, one or two). */
export function besideSeats(seat, seats) {
  const aisle = aisleAfter(seatCols(seats));
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
