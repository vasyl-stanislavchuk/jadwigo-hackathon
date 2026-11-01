/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ where: NonNullable<unknown> }} Leave_WhereInputs */
/**
* | output |
* | --- |
* | "{where} opens in a new tab." |
*
* @param {Leave_WhereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const leave_where: ((inputs: Leave_WhereInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Leave_WhereInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Leave_WhereInputs = {
    where: NonNullable<unknown>;
};
