/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_List_ReteachInputs */
/**
* | output |
* | --- |
* | "Teach again" |
*
* @param {Chat_Ideas_List_ReteachInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_list_reteach: ((inputs?: Chat_Ideas_List_ReteachInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_List_ReteachInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_List_ReteachInputs = {};
