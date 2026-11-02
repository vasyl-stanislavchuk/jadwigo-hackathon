/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Readback_TitleInputs */
/**
* | output |
* | --- |
* | "Tasks read · untick what isn't homework · {n}" |
*
* @param {Chat_Readback_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_readback_title: ((inputs: Chat_Readback_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Readback_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Readback_TitleInputs = {
    n: NonNullable<unknown>;
};
