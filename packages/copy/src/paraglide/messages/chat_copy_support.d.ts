/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Copy_SupportInputs */
/**
* | output |
* | --- |
* | "Copy details for support" |
*
* @param {Chat_Copy_SupportInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_copy_support: ((inputs?: Chat_Copy_SupportInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Copy_SupportInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Copy_SupportInputs = {};
