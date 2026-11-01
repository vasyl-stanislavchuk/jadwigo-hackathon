/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Clock_Points_AtInputs */
/**
* | output |
* | --- |
* | "points at {n}" |
*
* @param {Clock_Points_AtInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_points_at: ((inputs: Clock_Points_AtInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_Points_AtInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_Points_AtInputs = {
    n: NonNullable<unknown>;
};
