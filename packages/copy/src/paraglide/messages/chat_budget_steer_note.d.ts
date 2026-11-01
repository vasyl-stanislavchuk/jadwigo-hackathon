/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Budget_Steer_NoteInputs */
/**
* | output |
* | --- |
* | "The lesson so far is saved." |
*
* @param {Chat_Budget_Steer_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_budget_steer_note: ((inputs?: Chat_Budget_Steer_NoteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Budget_Steer_NoteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Budget_Steer_NoteInputs = {};
