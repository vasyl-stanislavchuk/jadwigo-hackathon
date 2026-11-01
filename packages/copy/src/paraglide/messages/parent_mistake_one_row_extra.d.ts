/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_One_Row_ExtraInputs */
/**
* | output |
* | --- |
* | "One row too many" |
*
* @param {Parent_Mistake_One_Row_ExtraInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_row_extra: ((inputs?: Parent_Mistake_One_Row_ExtraInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_One_Row_ExtraInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_One_Row_ExtraInputs = {};
