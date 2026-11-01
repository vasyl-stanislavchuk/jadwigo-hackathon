/**
 * How Polish writes a number (dl-5ssh.34.24): a decimal comma, `3,5`, and money as `3,50 zł`.
 * The judge reads a `.` the same (exact.ts, owner 2026-10-25); this is only how Jadwigo writes one.
 */

export const PL_DECIMAL_SEPARATOR = ",";

/** The locale `Intl` formats Polish numbers in. */
export const PL_LOCALE = "pl-PL";
