/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_Check_OkInputs */
/**
* | output |
* | --- |
* | "Checked the lesson: all good" |
*
* @param {Chat_Line_Check_OkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_check_ok: ((inputs?: Chat_Line_Check_OkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Check_OkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Check_OkInputs = {};
