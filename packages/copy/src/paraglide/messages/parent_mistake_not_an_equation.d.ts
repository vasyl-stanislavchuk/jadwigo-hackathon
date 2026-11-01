/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Not_An_EquationInputs */
/**
* | output |
* | --- |
* | "An expression where an equation was asked" |
*
* @param {Parent_Mistake_Not_An_EquationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_an_equation: ((inputs?: Parent_Mistake_Not_An_EquationInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Not_An_EquationInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Not_An_EquationInputs = {};
