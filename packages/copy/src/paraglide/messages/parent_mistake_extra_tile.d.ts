/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Extra_TileInputs */
/**
* | output |
* | --- |
* | "An extra tile" |
*
* @param {Parent_Mistake_Extra_TileInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_extra_tile: ((inputs?: Parent_Mistake_Extra_TileInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Extra_TileInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Extra_TileInputs = {};
