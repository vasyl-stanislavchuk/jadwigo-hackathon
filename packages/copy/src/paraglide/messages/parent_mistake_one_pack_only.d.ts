/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_One_Pack_OnlyInputs */
/**
* | output |
* | --- |
* | "Only one pack counted" |
*
* @param {Parent_Mistake_One_Pack_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_pack_only: ((inputs?: Parent_Mistake_One_Pack_OnlyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_One_Pack_OnlyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_One_Pack_OnlyInputs = {};
