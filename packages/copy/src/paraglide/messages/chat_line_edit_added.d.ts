/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, topic: NonNullable<unknown> }} Chat_Line_Edit_AddedInputs */
/**
* | output |
* | --- |
* | "Added question {n}: {topic}" |
*
* @param {Chat_Line_Edit_AddedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_added: ((inputs: Chat_Line_Edit_AddedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Edit_AddedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Edit_AddedInputs = {
    n: NonNullable<unknown>;
    topic: NonNullable<unknown>;
};
