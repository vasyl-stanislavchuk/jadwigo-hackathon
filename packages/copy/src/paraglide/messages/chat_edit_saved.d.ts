/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Edit_SavedInputs */
/**
* | output |
* | --- |
* | "Your change is in the lesson now." |
*
* @param {Chat_Edit_SavedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_saved: ((inputs?: Chat_Edit_SavedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Edit_SavedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Edit_SavedInputs = {};
