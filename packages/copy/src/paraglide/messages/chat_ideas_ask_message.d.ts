/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, list: NonNullable<unknown> }} Chat_Ideas_Ask_MessageInputs */
/**
* | output |
* | --- |
* | "Make a lesson from idea {n}: {list}." |
*
* @param {Chat_Ideas_Ask_MessageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_ask_message: ((inputs: Chat_Ideas_Ask_MessageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_Ask_MessageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_Ask_MessageInputs = {
    n: NonNullable<unknown>;
    list: NonNullable<unknown>;
};
