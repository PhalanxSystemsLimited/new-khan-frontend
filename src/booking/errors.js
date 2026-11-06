/**
 * Error codes the booking UI understands:
 * INVALID_INPUT | NOT_FOUND | SEAT_TAKEN | SEAT_GENDER (side-by-side male/female rule) | EXPIRED | INVALID_STATE | PAYMENT_FAILED | AUTH_REQUIRED | PAYMENT_UNAVAILABLE
 */
export class ApiError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
  }
}
