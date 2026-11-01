/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Fraction_WholeInputs */
/**
* | output |
* | --- |
* | "Whole number" |
*
* @param {Fraction_WholeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_whole: ((inputs?: Fraction_WholeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_WholeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_WholeInputs = {};
