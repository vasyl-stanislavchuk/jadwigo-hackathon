/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Same_TotalInputs */
/**
* | output |
* | --- |
* | "The same total, split another way" |
*
* @param {Parent_Mistake_Same_TotalInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_total: ((inputs?: Parent_Mistake_Same_TotalInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Same_TotalInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Same_TotalInputs = {};
