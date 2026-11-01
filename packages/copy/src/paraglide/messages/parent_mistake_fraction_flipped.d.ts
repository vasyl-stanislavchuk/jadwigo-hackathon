/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Fraction_FlippedInputs */
/**
* | output |
* | --- |
* | "The fraction upside down" |
*
* @param {Parent_Mistake_Fraction_FlippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_fraction_flipped: ((inputs?: Parent_Mistake_Fraction_FlippedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Fraction_FlippedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Fraction_FlippedInputs = {};
