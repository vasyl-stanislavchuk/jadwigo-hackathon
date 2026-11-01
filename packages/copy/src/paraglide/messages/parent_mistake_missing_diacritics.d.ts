/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Missing_DiacriticsInputs */
/**
* | output |
* | --- |
* | "The Polish letters' marks left out (ą, ę, ó)" |
*
* @param {Parent_Mistake_Missing_DiacriticsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_missing_diacritics: ((inputs?: Parent_Mistake_Missing_DiacriticsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Missing_DiacriticsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Missing_DiacriticsInputs = {};
