/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_JsonInputs */
/**
* | output |
* | --- |
* | "The lesson file can't be read." |
*
* @param {Chat_Finding_JsonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_json: ((inputs?: Chat_Finding_JsonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_JsonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_JsonInputs = {};
