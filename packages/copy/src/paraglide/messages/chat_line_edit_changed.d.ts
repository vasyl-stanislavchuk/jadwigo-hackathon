/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ list: NonNullable<unknown> }} Chat_Line_Edit_ChangedInputs */
/**
* | output |
* | --- |
* | "Changed questions {list}" |
*
* @param {Chat_Line_Edit_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_changed: ((inputs: Chat_Line_Edit_ChangedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Edit_ChangedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Edit_ChangedInputs = {
    list: NonNullable<unknown>;
};
