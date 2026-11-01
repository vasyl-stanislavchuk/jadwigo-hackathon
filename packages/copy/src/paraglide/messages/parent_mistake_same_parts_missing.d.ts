/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Same_Parts_MissingInputs */
/**
* | output |
* | --- |
* | "The parts not equal" |
*
* @param {Parent_Mistake_Same_Parts_MissingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_parts_missing: ((inputs?: Parent_Mistake_Same_Parts_MissingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Same_Parts_MissingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Same_Parts_MissingInputs = {};
