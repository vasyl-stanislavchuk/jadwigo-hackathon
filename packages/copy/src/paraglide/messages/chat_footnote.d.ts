/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_FootnoteInputs */
/**
* | output |
* | --- |
* | "Jadwigo AI isn't always right. Nothing reaches the child before you check it." |
*
* @param {Chat_FootnoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_footnote: ((inputs?: Chat_FootnoteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_FootnoteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_FootnoteInputs = {};
