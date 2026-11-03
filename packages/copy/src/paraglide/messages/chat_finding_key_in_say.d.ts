/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Key_In_SayInputs */
/**
* | output |
* | --- |
* | "The question gives the answer away." |
*
* @param {Chat_Finding_Key_In_SayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_key_in_say: ((inputs?: Chat_Finding_Key_In_SayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Key_In_SayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Key_In_SayInputs = {};
