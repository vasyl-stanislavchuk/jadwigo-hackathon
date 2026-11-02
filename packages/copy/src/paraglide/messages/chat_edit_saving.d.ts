/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Edit_SavingInputs */
/**
* | output |
* | --- |
* | "Saving your change to the lesson…" |
*
* @param {Chat_Edit_SavingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_edit_saving: ((inputs?: Chat_Edit_SavingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Edit_SavingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Edit_SavingInputs = {};
