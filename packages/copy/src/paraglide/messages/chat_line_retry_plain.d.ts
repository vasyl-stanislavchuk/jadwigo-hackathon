/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_Retry_PlainInputs */
/**
* | output |
* | --- |
* | "That took too long, trying again" |
*
* @param {Chat_Line_Retry_PlainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_retry_plain: ((inputs?: Chat_Line_Retry_PlainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_Retry_PlainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_Retry_PlainInputs = {};
