/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Failed_TitleInputs */
/**
* | output |
* | --- |
* | "Couldn't build the lesson." |
*
* @param {Chat_Failed_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_failed_title: ((inputs?: Chat_Failed_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Failed_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Failed_TitleInputs = {};
