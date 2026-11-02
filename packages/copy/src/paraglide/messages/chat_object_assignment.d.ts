/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Object_AssignmentInputs */
/**
* | output |
* | --- |
* | "Given lesson" |
*
* @param {Chat_Object_AssignmentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_object_assignment: ((inputs?: Chat_Object_AssignmentInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Object_AssignmentInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Object_AssignmentInputs = {};
