export class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message    Safe-to-show message
   * @param {{ errors?: object[], code?: string }} [extra]
   *   errors: per-field validation details; code: machine-readable reason
   */
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = extra.errors;
    this.code = extra.code;
  }
}