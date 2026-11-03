/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ text: NonNullable<unknown> }} Chat_Line_SayInputs */
/**
* | output |
* | --- |
* | "{text}" |
*
* @param {Chat_Line_SayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_say: ((inputs: Chat_Line_SayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_SayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_SayInputs = {
    text: NonNullable<unknown>;
};
