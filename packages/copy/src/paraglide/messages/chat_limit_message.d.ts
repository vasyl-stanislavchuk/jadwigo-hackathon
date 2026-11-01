/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_MessageInputs */
/**
* | output |
* | --- |
* | "The assistant can't take more messages right now. Try again later." |
*
* @param {Chat_Limit_MessageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_message: ((inputs?: Chat_Limit_MessageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Limit_MessageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Limit_MessageInputs = {};
