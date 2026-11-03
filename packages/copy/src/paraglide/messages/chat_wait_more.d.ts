/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Wait_MoreInputs */
/**
* | output |
* | --- |
* | "Keep waiting" |
*
* @param {Chat_Wait_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_wait_more: ((inputs?: Chat_Wait_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Wait_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Wait_MoreInputs = {};
