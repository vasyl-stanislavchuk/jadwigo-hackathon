/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Explain_FirstInputs */
/**
* | output |
* | --- |
* | "The lesson opens with an explanation; it should open with a question." |
*
* @param {Chat_Finding_Explain_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_explain_first: ((inputs?: Chat_Finding_Explain_FirstInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Explain_FirstInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Explain_FirstInputs = {};
