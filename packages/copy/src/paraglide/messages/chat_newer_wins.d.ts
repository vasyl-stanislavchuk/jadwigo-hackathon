/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Newer_WinsInputs */
/**
* | output |
* | --- |
* | "Your version is newer, so it stays. The assistant knows." |
*
* @param {Chat_Newer_WinsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_newer_wins: ((inputs?: Chat_Newer_WinsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Newer_WinsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Newer_WinsInputs = {};
