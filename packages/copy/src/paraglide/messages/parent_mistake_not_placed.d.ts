/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Not_PlacedInputs */
/**
* | output |
* | --- |
* | "Some pieces not placed yet" |
*
* @param {Parent_Mistake_Not_PlacedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_not_placed: ((inputs?: Parent_Mistake_Not_PlacedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Not_PlacedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Not_PlacedInputs = {};
