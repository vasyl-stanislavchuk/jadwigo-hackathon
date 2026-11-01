/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Odd_As_EvenInputs */
/**
* | output |
* | --- |
* | "An odd number taken for an even one" |
*
* @param {Parent_Mistake_Odd_As_EvenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_odd_as_even: ((inputs?: Parent_Mistake_Odd_As_EvenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Odd_As_EvenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Odd_As_EvenInputs = {};
