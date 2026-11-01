/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Half_Past_Wrong_HourInputs */
/**
* | output |
* | --- |
* | "Half past, with the hour next to it" |
*
* @param {Parent_Mistake_Half_Past_Wrong_HourInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_half_past_wrong_hour: ((inputs?: Parent_Mistake_Half_Past_Wrong_HourInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Half_Past_Wrong_HourInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Half_Past_Wrong_HourInputs = {};
