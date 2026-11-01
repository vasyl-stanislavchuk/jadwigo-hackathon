/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Kept_The_Old_PriceInputs */
/**
* | output |
* | --- |
* | "The old price kept" |
*
* @param {Parent_Mistake_Kept_The_Old_PriceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_kept_the_old_price: ((inputs?: Parent_Mistake_Kept_The_Old_PriceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Kept_The_Old_PriceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Kept_The_Old_PriceInputs = {};
