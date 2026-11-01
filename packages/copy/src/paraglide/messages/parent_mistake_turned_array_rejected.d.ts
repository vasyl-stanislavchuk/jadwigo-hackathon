/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Turned_Array_RejectedInputs */
/**
* | output |
* | --- |
* | "A turned array taken for a different one" |
*
* @param {Parent_Mistake_Turned_Array_RejectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_turned_array_rejected: ((inputs?: Parent_Mistake_Turned_Array_RejectedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Turned_Array_RejectedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Turned_Array_RejectedInputs = {};
