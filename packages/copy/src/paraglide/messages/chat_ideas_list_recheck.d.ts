/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Ideas_List_RecheckInputs */
/**
* | output |
* | --- |
* | "Check again" |
*
* @param {Chat_Ideas_List_RecheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_list_recheck: ((inputs?: Chat_Ideas_List_RecheckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_List_RecheckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_List_RecheckInputs = {};
