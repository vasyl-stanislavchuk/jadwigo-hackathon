/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_List_Archive_ConfirmInputs */
/**
* | output |
* | --- |
* | "The conversation leaves the list. It is kept with your family's account and deleted along with it." |
*
* @param {Chat_List_Archive_ConfirmInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_archive_confirm: ((inputs?: Chat_List_Archive_ConfirmInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_List_Archive_ConfirmInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_List_Archive_ConfirmInputs = {};
