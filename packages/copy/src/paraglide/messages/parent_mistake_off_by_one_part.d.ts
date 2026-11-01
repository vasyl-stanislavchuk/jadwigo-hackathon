/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Off_By_One_PartInputs */
/**
* | output |
* | --- |
* | "One part too many or too few" |
*
* @param {Parent_Mistake_Off_By_One_PartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_one_part: ((inputs?: Parent_Mistake_Off_By_One_PartInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Off_By_One_PartInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Off_By_One_PartInputs = {};
