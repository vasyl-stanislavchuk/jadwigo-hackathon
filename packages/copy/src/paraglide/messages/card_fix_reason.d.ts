/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Fix_ReasonInputs */
/**
* | output |
* | --- |
* | "You can give the lesson once the questions are fixed." |
*
* @param {Card_Fix_ReasonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_fix_reason: ((inputs?: Card_Fix_ReasonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Fix_ReasonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Fix_ReasonInputs = {};
