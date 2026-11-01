/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Smaller_Pieces_OnlyInputs */
/**
* | output |
* | --- |
* | "Only the smaller pieces looked at" |
*
* @param {Parent_Mistake_Smaller_Pieces_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_smaller_pieces_only: ((inputs?: Parent_Mistake_Smaller_Pieces_OnlyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Smaller_Pieces_OnlyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Smaller_Pieces_OnlyInputs = {};
