/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Added_Not_SubtractedInputs */
/**
* | output |
* | --- |
* | "Added instead of subtracting" |
*
* @param {Parent_Mistake_Added_Not_SubtractedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_added_not_subtracted: ((inputs?: Parent_Mistake_Added_Not_SubtractedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Added_Not_SubtractedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Added_Not_SubtractedInputs = {};
