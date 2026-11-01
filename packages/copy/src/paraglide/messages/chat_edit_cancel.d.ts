/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Edit_CancelInputs */
/**
* | output |
* | --- |
* | "Cancel" |
*
* @param {Chat_Edit_CancelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_cancel: ((inputs?: Chat_Edit_CancelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Edit_CancelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Edit_CancelInputs = {};
