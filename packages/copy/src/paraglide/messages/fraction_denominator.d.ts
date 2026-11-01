/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Fraction_DenominatorInputs */
/**
* | output |
* | --- |
* | "Bottom number" |
*
* @param {Fraction_DenominatorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_denominator: ((inputs?: Fraction_DenominatorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_DenominatorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_DenominatorInputs = {};
