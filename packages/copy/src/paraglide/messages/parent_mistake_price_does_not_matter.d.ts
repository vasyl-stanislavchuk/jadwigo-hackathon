/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Price_Does_Not_MatterInputs */
/**
* | output |
* | --- |
* | "The price left out of the comparison" |
*
* @param {Parent_Mistake_Price_Does_Not_MatterInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_price_does_not_matter: ((inputs?: Parent_Mistake_Price_Does_Not_MatterInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Price_Does_Not_MatterInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Price_Does_Not_MatterInputs = {};
