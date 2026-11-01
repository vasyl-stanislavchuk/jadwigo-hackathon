/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Gap_SwapInputs */
/**
* | output |
* | --- |
* | "A swap of the answers in 2 blanks" |
*
* @param {Parent_Mistake_Gap_SwapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_gap_swap: ((inputs?: Parent_Mistake_Gap_SwapInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Gap_SwapInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Gap_SwapInputs = {};
