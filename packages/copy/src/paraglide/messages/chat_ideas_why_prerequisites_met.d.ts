/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_Why_Prerequisites_MetInputs */
/**
* | output |
* | --- |
* | "The basics are in place" |
*
* @param {Chat_Ideas_Why_Prerequisites_MetInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_prerequisites_met: ((inputs?: Chat_Ideas_Why_Prerequisites_MetInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_Why_Prerequisites_MetInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_Why_Prerequisites_MetInputs = {};
