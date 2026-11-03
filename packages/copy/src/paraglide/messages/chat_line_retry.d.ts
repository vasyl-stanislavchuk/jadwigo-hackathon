/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ stage: NonNullable<unknown> }} Chat_Line_RetryInputs */
/**
* | output |
* | --- |
* | "{stage} took too long, trying again" |
*
* @param {Chat_Line_RetryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_retry: ((inputs: Chat_Line_RetryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_RetryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_RetryInputs = {
    stage: NonNullable<unknown>;
};
