/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Missing_TileInputs */
/**
* | output |
* | --- |
* | "A tile left out" |
*
* @param {Parent_Mistake_Missing_TileInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missing_tile: ((inputs?: Parent_Mistake_Missing_TileInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Missing_TileInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Missing_TileInputs = {};
