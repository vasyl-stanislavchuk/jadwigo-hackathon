/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Fraction_SimplifyInputs */
/**
* | output |
* | --- |
* | "Can you write this fraction more simply?" |
*
* @param {Fraction_SimplifyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_simplify: ((inputs?: Fraction_SimplifyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_SimplifyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_SimplifyInputs = {};
