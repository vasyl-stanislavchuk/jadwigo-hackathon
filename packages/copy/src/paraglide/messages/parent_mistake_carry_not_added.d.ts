/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Carry_Not_AddedInputs */
/**
* | output |
* | --- |
* | "The carried number not added" |
*
* @param {Parent_Mistake_Carry_Not_AddedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_carry_not_added: ((inputs?: Parent_Mistake_Carry_Not_AddedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Carry_Not_AddedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Carry_Not_AddedInputs = {};
