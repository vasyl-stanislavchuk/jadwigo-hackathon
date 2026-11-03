/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_Card_TitleInputs */
/**
* | output |
* | --- |
* | "Answer card" |
*
* @param {Print_Card_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_card_title: ((inputs?: Print_Card_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_Card_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_Card_TitleInputs = {};
