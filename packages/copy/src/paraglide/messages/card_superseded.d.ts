/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Card_SupersededInputs */
/**
* | output |
* | --- |
* | "version {n} · newer exists" |
*
* @param {Card_SupersededInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_superseded: ((inputs: Card_SupersededInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_SupersededInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_SupersededInputs = {
    n: NonNullable<unknown>;
};
