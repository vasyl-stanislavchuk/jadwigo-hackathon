/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_Verb_NumberInputs */
/**
* | output |
* | --- |
* | "number" |
*
* @param {Print_Verb_NumberInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_verb_number: ((inputs?: Print_Verb_NumberInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_Verb_NumberInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_Verb_NumberInputs = {};
