/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Edit_WordsInputs */
/**
* | output |
* | --- |
* | "What this step says to the child" |
*
* @param {Chat_Edit_WordsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_words: ((inputs?: Chat_Edit_WordsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Edit_WordsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Edit_WordsInputs = {};
