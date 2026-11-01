/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Grid_Off_By_OneInputs */
/**
* | output |
* | --- |
* | "One square away on the grid" |
*
* @param {Parent_Mistake_Grid_Off_By_OneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_grid_off_by_one: ((inputs?: Parent_Mistake_Grid_Off_By_OneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Grid_Off_By_OneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Grid_Off_By_OneInputs = {};
