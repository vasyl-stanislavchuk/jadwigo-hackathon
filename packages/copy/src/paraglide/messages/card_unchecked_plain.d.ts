/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Unchecked_PlainInputs */
/**
* | output |
* | --- |
* | "Nobody has checked this lesson yet." |
*
* @param {Card_Unchecked_PlainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_unchecked_plain: ((inputs?: Card_Unchecked_PlainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Unchecked_PlainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Unchecked_PlainInputs = {};
