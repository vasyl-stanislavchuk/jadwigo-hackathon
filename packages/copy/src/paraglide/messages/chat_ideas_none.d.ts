/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_NoneInputs */
/**
* | output |
* | --- |
* | "No ideas for the next lesson yet." |
*
* @param {Chat_Ideas_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_none: ((inputs?: Chat_Ideas_NoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_NoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_NoneInputs = {};
