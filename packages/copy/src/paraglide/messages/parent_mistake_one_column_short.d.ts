/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_One_Column_ShortInputs */
/**
* | output |
* | --- |
* | "One column too few" |
*
* @param {Parent_Mistake_One_Column_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_column_short: ((inputs?: Parent_Mistake_One_Column_ShortInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_One_Column_ShortInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_One_Column_ShortInputs = {};
