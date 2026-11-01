/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_One_Coin_OffInputs */
/**
* | output |
* | --- |
* | "One coin away from the amount" |
*
* @param {Parent_Mistake_One_Coin_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_one_coin_off: ((inputs?: Parent_Mistake_One_Coin_OffInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_One_Coin_OffInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_One_Coin_OffInputs = {};
