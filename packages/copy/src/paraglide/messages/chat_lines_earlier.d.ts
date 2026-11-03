/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Lines_EarlierInputs */
/**
* | output |
* | --- |
* | "{n} earlier" |
*
* @param {Chat_Lines_EarlierInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lines_earlier: ((inputs: Chat_Lines_EarlierInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lines_EarlierInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lines_EarlierInputs = {
    n: NonNullable<unknown>;
};
