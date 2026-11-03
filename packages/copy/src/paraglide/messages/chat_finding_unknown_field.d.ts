/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Unknown_FieldInputs */
/**
* | output |
* | --- |
* | "This question has a part the lesson doesn't know." |
*
* @param {Chat_Finding_Unknown_FieldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_unknown_field: ((inputs?: Chat_Finding_Unknown_FieldInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Unknown_FieldInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Unknown_FieldInputs = {};
