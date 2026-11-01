/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Confuses_DifferenceInputs */
/**
* | output |
* | --- |
* | "The word \"difference\" taken for another term" |
*
* @param {Parent_Mistake_Confuses_DifferenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_difference: ((inputs?: Parent_Mistake_Confuses_DifferenceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Confuses_DifferenceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Confuses_DifferenceInputs = {};
