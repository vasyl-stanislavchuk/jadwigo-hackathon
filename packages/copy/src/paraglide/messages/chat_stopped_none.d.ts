/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Stopped_NoneInputs */
/**
* | output |
* | --- |
* | "Stopped. The lesson is still version {n}; I didn't change anything." |
*
* @param {Chat_Stopped_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_none: ((inputs: Chat_Stopped_NoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stopped_NoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stopped_NoneInputs = {
    n: NonNullable<unknown>;
};
