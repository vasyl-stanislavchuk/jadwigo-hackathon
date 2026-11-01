/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Took_Unneeded_NumberInputs */
/**
* | output |
* | --- |
* | "A number used that the question did not need" |
*
* @param {Parent_Mistake_Took_Unneeded_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_took_unneeded_number: ((inputs?: Parent_Mistake_Took_Unneeded_NumberInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Took_Unneeded_NumberInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Took_Unneeded_NumberInputs = {};
