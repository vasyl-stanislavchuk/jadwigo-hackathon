/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Hands_SwappedInputs */
/**
* | output |
* | --- |
* | "The clock's hands swapped" |
*
* @param {Parent_Mistake_Hands_SwappedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_hands_swapped: ((inputs?: Parent_Mistake_Hands_SwappedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Hands_SwappedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Hands_SwappedInputs = {};
