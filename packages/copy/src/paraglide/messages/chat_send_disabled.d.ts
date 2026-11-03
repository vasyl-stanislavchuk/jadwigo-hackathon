/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Send_DisabledInputs */
/**
* | output |
* | --- |
* | "Type something or add a photo." |
*
* @param {Chat_Send_DisabledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_send_disabled: ((inputs?: Chat_Send_DisabledInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Send_DisabledInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Send_DisabledInputs = {};
