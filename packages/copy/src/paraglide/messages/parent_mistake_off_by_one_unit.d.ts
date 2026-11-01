/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Off_By_One_UnitInputs */
/**
* | output |
* | --- |
* | "One unit away" |
*
* @param {Parent_Mistake_Off_By_One_UnitInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_off_by_one_unit: ((inputs?: Parent_Mistake_Off_By_One_UnitInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Off_By_One_UnitInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Off_By_One_UnitInputs = {};
