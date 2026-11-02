/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Not_FoundInputs */
/**
* | output |
* | --- |
* | "There's no such lesson here. It may belong to another account, or it was deleted." |
*
* @param {Chat_Not_FoundInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_not_found: ((inputs?: Chat_Not_FoundInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Not_FoundInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Not_FoundInputs = {};
