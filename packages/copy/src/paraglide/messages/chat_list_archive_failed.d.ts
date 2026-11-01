/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_List_Archive_FailedInputs */
/**
* | output |
* | --- |
* | "The conversation wasn't archived. Try again." |
*
* @param {Chat_List_Archive_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_list_archive_failed: ((inputs?: Chat_List_Archive_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_List_Archive_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_List_Archive_FailedInputs = {};
