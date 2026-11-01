/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Zloty_Grosze_MixedInputs */
/**
* | output |
* | --- |
* | "The 2 units of Polish money mixed up" |
*
* @param {Parent_Mistake_Zloty_Grosze_MixedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_zloty_grosze_mixed: ((inputs?: Parent_Mistake_Zloty_Grosze_MixedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Zloty_Grosze_MixedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Zloty_Grosze_MixedInputs = {};
