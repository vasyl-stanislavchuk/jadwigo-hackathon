/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_Why_Needs_AttentionInputs */
/**
* | output |
* | --- |
* | "Was hard lately" |
*
* @param {Chat_Ideas_Why_Needs_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_why_needs_attention: ((inputs?: Chat_Ideas_Why_Needs_AttentionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_Why_Needs_AttentionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_Why_Needs_AttentionInputs = {};
