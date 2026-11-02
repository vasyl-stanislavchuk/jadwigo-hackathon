/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Question_TypesInputs */
/**
* | output |
* | --- |
* | "Checking the kinds of questions" |
*
* @param {Chat_Tool_Question_TypesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_question_types: ((inputs?: Chat_Tool_Question_TypesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Question_TypesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Question_TypesInputs = {};
