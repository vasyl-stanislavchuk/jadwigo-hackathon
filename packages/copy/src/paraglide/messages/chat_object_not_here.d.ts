/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Object_Not_HereInputs */
/**
* | output |
* | --- |
* | "This can't be shown here yet." |
*
* @param {Chat_Object_Not_HereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_not_here: ((inputs?: Chat_Object_Not_HereInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Object_Not_HereInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Object_Not_HereInputs = {};
