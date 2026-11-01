/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Bar_WrongInputs */
/**
* | output |
* | --- |
* | "A bar of another height" |
*
* @param {Parent_Mistake_Bar_WrongInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_bar_wrong: ((inputs?: Parent_Mistake_Bar_WrongInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Bar_WrongInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Bar_WrongInputs = {};
