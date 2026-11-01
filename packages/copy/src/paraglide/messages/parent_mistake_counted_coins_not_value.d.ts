/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Counted_Coins_Not_ValueInputs */
/**
* | output |
* | --- |
* | "The coins counted, not their value" |
*
* @param {Parent_Mistake_Counted_Coins_Not_ValueInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_counted_coins_not_value: ((inputs?: Parent_Mistake_Counted_Coins_Not_ValueInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Counted_Coins_Not_ValueInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Counted_Coins_Not_ValueInputs = {};
