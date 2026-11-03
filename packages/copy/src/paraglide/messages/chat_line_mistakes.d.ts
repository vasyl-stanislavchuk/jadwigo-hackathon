/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_MistakesInputs */
/**
* | output |
* | --- |
* | "Looked at what was tricky" |
*
* @param {Chat_Line_MistakesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_mistakes: ((inputs?: Chat_Line_MistakesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_MistakesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_MistakesInputs = {};
