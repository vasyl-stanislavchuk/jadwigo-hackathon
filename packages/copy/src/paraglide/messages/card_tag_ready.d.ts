/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Card_Tag_ReadyInputs */
/**
* | output |
* | --- |
* | "Ready" |
*
* @param {Card_Tag_ReadyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_tag_ready: ((inputs?: Card_Tag_ReadyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_Tag_ReadyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_Tag_ReadyInputs = {};
