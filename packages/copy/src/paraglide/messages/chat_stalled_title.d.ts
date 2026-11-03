/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Stalled_TitleInputs */
/**
* | output |
* | --- |
* | "Nothing has happened for a minute." |
*
* @param {Chat_Stalled_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stalled_title: ((inputs?: Chat_Stalled_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stalled_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stalled_TitleInputs = {};
