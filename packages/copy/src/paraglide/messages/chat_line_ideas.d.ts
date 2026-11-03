/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_IdeasInputs */
/**
* | output |
* | --- |
* | "Gathered lesson ideas" |
*
* @param {Chat_Line_IdeasInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_ideas: ((inputs?: Chat_Line_IdeasInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_IdeasInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_IdeasInputs = {};
