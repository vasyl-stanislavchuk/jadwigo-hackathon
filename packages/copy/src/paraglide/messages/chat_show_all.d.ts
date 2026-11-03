/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Show_AllInputs */
/**
* | output |
* | --- |
* | "Show all ({n})" |
*
* @param {Chat_Show_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_show_all: ((inputs: Chat_Show_AllInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Show_AllInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Show_AllInputs = {
    n: NonNullable<unknown>;
};
