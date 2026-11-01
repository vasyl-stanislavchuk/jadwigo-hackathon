/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Multiplied_Not_DividedInputs */
/**
* | output |
* | --- |
* | "Multiplied instead of dividing" |
*
* @param {Parent_Mistake_Multiplied_Not_DividedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_multiplied_not_divided: ((inputs?: Parent_Mistake_Multiplied_Not_DividedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Multiplied_Not_DividedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Multiplied_Not_DividedInputs = {};
