/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Revision_By_AiInputs */
/**
* | output |
* | --- |
* | "Changed by the assistant" |
*
* @param {Chat_Revision_By_AiInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_revision_by_ai: ((inputs?: Chat_Revision_By_AiInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Revision_By_AiInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Revision_By_AiInputs = {};
