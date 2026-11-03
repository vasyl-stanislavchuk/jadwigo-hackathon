/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_No_QuestionInputs */
/**
* | output |
* | --- |
* | "The lesson has no question yet." |
*
* @param {Chat_Finding_No_QuestionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_no_question: ((inputs?: Chat_Finding_No_QuestionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_No_QuestionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_No_QuestionInputs = {};
