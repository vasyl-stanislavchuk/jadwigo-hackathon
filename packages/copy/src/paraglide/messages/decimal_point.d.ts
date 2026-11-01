/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Decimal_PointInputs */
/**
* | output |
* | --- |
* | "Decimal point" |
*
* @param {Decimal_PointInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const decimal_point: ((inputs?: Decimal_PointInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Decimal_PointInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Decimal_PointInputs = {};
