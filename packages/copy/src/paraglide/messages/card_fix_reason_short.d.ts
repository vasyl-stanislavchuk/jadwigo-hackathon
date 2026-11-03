/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Card_Fix_Reason_ShortInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question needs fixing first." |
* | "other" | "{n} questions need fixing first." |
*
* @param {Card_Fix_Reason_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_fix_reason_short: ((inputs: Card_Fix_Reason_ShortInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Fix_Reason_ShortInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Fix_Reason_ShortInputs = {
    n: NonNullable<unknown>;
};
