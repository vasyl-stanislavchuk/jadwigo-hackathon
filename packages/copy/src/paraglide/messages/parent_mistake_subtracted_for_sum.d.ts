/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Subtracted_For_SumInputs */
/**
* | output |
* | --- |
* | "Subtracted where a sum was asked for" |
*
* @param {Parent_Mistake_Subtracted_For_SumInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_subtracted_for_sum: ((inputs?: Parent_Mistake_Subtracted_For_SumInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Subtracted_For_SumInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Subtracted_For_SumInputs = {};
