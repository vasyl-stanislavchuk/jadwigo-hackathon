/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Key_GradesInputs */
/**
* | output |
* | --- |
* | "The right answer would not be marked right." |
*
* @param {Chat_Finding_Key_GradesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_key_grades: ((inputs?: Chat_Finding_Key_GradesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Key_GradesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Key_GradesInputs = {};
