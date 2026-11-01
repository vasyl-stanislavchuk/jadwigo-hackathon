/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_Decimal_PointInputs */
/**
* | output |
* | --- |
* | "Write a digit after the decimal point." |
*
* @param {Incomplete_Decimal_PointInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_decimal_point: ((inputs?: Incomplete_Decimal_PointInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_Decimal_PointInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_Decimal_PointInputs = {};
