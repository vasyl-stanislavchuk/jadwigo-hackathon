/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Harsh_WordInputs */
/**
* | output |
* | --- |
* | "A child would read a word that is too harsh here." |
*
* @param {Chat_Finding_Harsh_WordInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_harsh_word: ((inputs?: Chat_Finding_Harsh_WordInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Harsh_WordInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Harsh_WordInputs = {};
