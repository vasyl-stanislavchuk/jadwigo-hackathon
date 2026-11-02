/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Object_Open_PageInputs */
/**
* | output |
* | --- |
* | "Open on its own page" |
*
* @param {Chat_Object_Open_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_open_page: ((inputs?: Chat_Object_Open_PageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Object_Open_PageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Object_Open_PageInputs = {};
