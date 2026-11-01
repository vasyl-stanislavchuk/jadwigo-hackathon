/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Add_For_MultiplyInputs */
/**
* | output |
* | --- |
* | "Added instead of multiplying" |
*
* @param {Parent_Mistake_Add_For_MultiplyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_add_for_multiply: ((inputs?: Parent_Mistake_Add_For_MultiplyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Add_For_MultiplyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Add_For_MultiplyInputs = {};
