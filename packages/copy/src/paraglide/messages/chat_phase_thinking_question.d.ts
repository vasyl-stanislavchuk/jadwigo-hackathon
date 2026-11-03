/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Phase_Thinking_QuestionInputs */
/**
* | output |
* | --- |
* | "Thinking about your question" |
*
* @param {Chat_Phase_Thinking_QuestionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_thinking_question: ((inputs?: Chat_Phase_Thinking_QuestionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Thinking_QuestionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Thinking_QuestionInputs = {};
