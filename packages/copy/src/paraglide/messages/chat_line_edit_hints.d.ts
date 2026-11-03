/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ list: NonNullable<unknown> }} Chat_Line_Edit_HintsInputs */
/**
* | output |
* | --- |
* | "Fixed the hints in questions {list}" |
*
* @param {Chat_Line_Edit_HintsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_edit_hints: ((inputs: Chat_Line_Edit_HintsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Edit_HintsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Edit_HintsInputs = {
    list: NonNullable<unknown>;
};
