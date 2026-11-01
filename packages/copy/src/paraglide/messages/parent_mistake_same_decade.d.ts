/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Same_DecadeInputs */
/**
* | output |
* | --- |
* | "The tens in place, the ones different" |
*
* @param {Parent_Mistake_Same_DecadeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_decade: ((inputs?: Parent_Mistake_Same_DecadeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Same_DecadeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Same_DecadeInputs = {};
