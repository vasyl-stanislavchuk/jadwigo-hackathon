/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Equation_Sides_SwappedInputs */
/**
* | output |
* | --- |
* | "The equation's sides swapped" |
*
* @param {Parent_Mistake_Equation_Sides_SwappedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_equation_sides_swapped: ((inputs?: Parent_Mistake_Equation_Sides_SwappedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Equation_Sides_SwappedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Equation_Sides_SwappedInputs = {};
