/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Fraction_NumeratorInputs */
/**
* | output |
* | --- |
* | "Top number" |
*
* @param {Fraction_NumeratorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_numerator: ((inputs?: Fraction_NumeratorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_NumeratorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_NumeratorInputs = {};
