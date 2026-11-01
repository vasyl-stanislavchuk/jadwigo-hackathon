/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Missed_Needed_NumberInputs */
/**
* | output |
* | --- |
* | "A number left out that the question needed" |
*
* @param {Parent_Mistake_Missed_Needed_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missed_needed_number: ((inputs?: Parent_Mistake_Missed_Needed_NumberInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Missed_Needed_NumberInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Missed_Needed_NumberInputs = {};
