/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Stopped_SomeInputs */
/**
* | output |
* | --- |
* | "Stopped. The lesson is now version {n}, with what I managed to change." |
*
* @param {Chat_Stopped_SomeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_stopped_some: ((inputs: Chat_Stopped_SomeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Stopped_SomeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Stopped_SomeInputs = {
    n: NonNullable<unknown>;
};
