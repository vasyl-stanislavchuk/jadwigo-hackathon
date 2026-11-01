/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Neighbour_RowInputs */
/**
* | output |
* | --- |
* | "A result from the next row of the times table" |
*
* @param {Parent_Mistake_Neighbour_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_neighbour_row: ((inputs?: Parent_Mistake_Neighbour_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Neighbour_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Neighbour_RowInputs = {};
