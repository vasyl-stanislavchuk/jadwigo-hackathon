/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Mistakes_NoneInputs */
/**
* | output |
* | --- |
* | "Nothing was hard lately." |
*
* @param {Chat_Mistakes_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_none: ((inputs?: Chat_Mistakes_NoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Mistakes_NoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Mistakes_NoneInputs = {};
