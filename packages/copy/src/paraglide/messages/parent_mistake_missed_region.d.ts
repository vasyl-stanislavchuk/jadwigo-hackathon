/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Missed_RegionInputs */
/**
* | output |
* | --- |
* | "Another place marked on the picture" |
*
* @param {Parent_Mistake_Missed_RegionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missed_region: ((inputs?: Parent_Mistake_Missed_RegionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Missed_RegionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Missed_RegionInputs = {};
