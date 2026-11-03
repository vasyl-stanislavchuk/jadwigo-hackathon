/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Tag_FixInputs */
/**
* | output |
* | --- |
* | "Needs fixing" |
*
* @param {Card_Tag_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_tag_fix: ((inputs?: Card_Tag_FixInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Tag_FixInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Tag_FixInputs = {};
