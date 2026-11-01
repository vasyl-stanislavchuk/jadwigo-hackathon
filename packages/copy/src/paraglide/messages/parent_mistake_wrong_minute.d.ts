/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Wrong_MinuteInputs */
/**
* | output |
* | --- |
* | "Another minute" |
*
* @param {Parent_Mistake_Wrong_MinuteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_wrong_minute: ((inputs?: Parent_Mistake_Wrong_MinuteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Wrong_MinuteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Wrong_MinuteInputs = {};
