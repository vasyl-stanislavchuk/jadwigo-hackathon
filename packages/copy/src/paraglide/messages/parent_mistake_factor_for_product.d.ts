/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Factor_For_ProductInputs */
/**
* | output |
* | --- |
* | "A factor where a product was asked for" |
*
* @param {Parent_Mistake_Factor_For_ProductInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_factor_for_product: ((inputs?: Parent_Mistake_Factor_For_ProductInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Factor_For_ProductInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Factor_For_ProductInputs = {};
