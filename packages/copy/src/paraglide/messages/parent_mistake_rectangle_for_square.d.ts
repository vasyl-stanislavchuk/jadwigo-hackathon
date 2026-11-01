/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Rectangle_For_SquareInputs */
/**
* | output |
* | --- |
* | "A rectangle where a square was asked for" |
*
* @param {Parent_Mistake_Rectangle_For_SquareInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_rectangle_for_square: ((inputs?: Parent_Mistake_Rectangle_For_SquareInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Rectangle_For_SquareInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Rectangle_For_SquareInputs = {};
