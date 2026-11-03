/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Unchecked_ReasonInputs */
/**
* | output |
* | --- |
* | "This version hasn't been checked. “Fix it for me” will check and fix it." |
*
* @param {Card_Unchecked_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_unchecked_reason: ((inputs?: Card_Unchecked_ReasonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Unchecked_ReasonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Unchecked_ReasonInputs = {};
