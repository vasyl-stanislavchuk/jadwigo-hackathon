/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Line_ReadInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Read the lesson: {n} question" |
* | "other" | "Read the lesson: {n} questions" |
*
* @param {Chat_Line_ReadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_read: ((inputs: Chat_Line_ReadInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_ReadInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_ReadInputs = {
    n: NonNullable<unknown>;
};
