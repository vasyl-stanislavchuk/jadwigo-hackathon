/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Edit_Not_AppliedInputs */
/**
* | output |
* | --- |
* | "This change wasn't applied: the lesson changed in the meantime, or the change doesn't fit it. Your text is below." |
*
* @param {Chat_Edit_Not_AppliedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_not_applied: ((inputs?: Chat_Edit_Not_AppliedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Edit_Not_AppliedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Edit_Not_AppliedInputs = {};
