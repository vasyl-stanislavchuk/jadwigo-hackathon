/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Answer_Card_FixInputs */
/**
* | output |
* | --- |
* | "Changed your mind? Cross the circle out with an X and fill in the one you choose." |
*
* @param {Answer_Card_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_fix: ((inputs?: Answer_Card_FixInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Answer_Card_FixInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Answer_Card_FixInputs = {};
