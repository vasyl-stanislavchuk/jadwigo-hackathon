/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Bigger_Denominator_BiggerInputs */
/**
* | output |
* | --- |
* | "A greater denominator taken for a greater fraction" |
*
* @param {Parent_Mistake_Bigger_Denominator_BiggerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_bigger_denominator_bigger: ((inputs?: Parent_Mistake_Bigger_Denominator_BiggerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Bigger_Denominator_BiggerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Bigger_Denominator_BiggerInputs = {};
