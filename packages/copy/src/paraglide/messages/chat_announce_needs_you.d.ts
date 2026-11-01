/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Announce_Needs_YouInputs */
/**
* | output |
* | --- |
* | "The assistant is waiting for your answer." |
*
* @param {Chat_Announce_Needs_YouInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_announce_needs_you: ((inputs?: Chat_Announce_Needs_YouInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Announce_Needs_YouInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Announce_Needs_YouInputs = {};
