/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Tens_OnlyInputs */
/**
* | output |
* | --- |
* | "Only the tens, the ones left out" |
*
* @param {Parent_Mistake_Tens_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_tens_only: ((inputs?: Parent_Mistake_Tens_OnlyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Tens_OnlyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Tens_OnlyInputs = {};
