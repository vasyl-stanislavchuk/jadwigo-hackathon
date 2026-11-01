/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Forgot_CarryInputs */
/**
* | output |
* | --- |
* | "The carry left out" |
*
* @param {Parent_Mistake_Forgot_CarryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_forgot_carry: ((inputs?: Parent_Mistake_Forgot_CarryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Forgot_CarryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Forgot_CarryInputs = {};
