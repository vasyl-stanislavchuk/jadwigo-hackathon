/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Object_AttemptInputs */
/**
* | output |
* | --- |
* | "Played lesson" |
*
* @param {Chat_Object_AttemptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_attempt: ((inputs?: Chat_Object_AttemptInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Object_AttemptInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Object_AttemptInputs = {};
