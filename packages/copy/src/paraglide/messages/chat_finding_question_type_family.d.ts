/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Question_Type_FamilyInputs */
/**
* | output |
* | --- |
* | "The question type doesn't match its form." |
*
* @param {Chat_Finding_Question_Type_FamilyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_question_type_family: ((inputs?: Chat_Finding_Question_Type_FamilyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Question_Type_FamilyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Question_Type_FamilyInputs = {};
