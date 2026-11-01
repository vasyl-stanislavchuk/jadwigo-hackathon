/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Counted_In_TensInputs */
/**
* | output |
* | --- |
* | "Counted in tens instead of ones" |
*
* @param {Parent_Mistake_Counted_In_TensInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_counted_in_tens: ((inputs?: Parent_Mistake_Counted_In_TensInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Counted_In_TensInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Counted_In_TensInputs = {};
