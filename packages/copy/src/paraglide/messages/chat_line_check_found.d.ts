/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Line_Check_FoundInputs */
/**
* | things_noun | output |
* | --- | --- |
* | "one" | "Checked the lesson: {n} thing to fix" |
* | "other" | "Checked the lesson: {n} things to fix" |
*
* @param {Chat_Line_Check_FoundInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_check_found: ((inputs: Chat_Line_Check_FoundInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Check_FoundInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Check_FoundInputs = {
    n: NonNullable<unknown>;
};
