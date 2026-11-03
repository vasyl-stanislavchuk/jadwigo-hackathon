/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Week_QuestionsInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question" |
* | "other" | "{n} questions" |
*
* @param {Chat_Week_QuestionsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_week_questions: ((inputs: Chat_Week_QuestionsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Week_QuestionsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Week_QuestionsInputs = {
    n: NonNullable<unknown>;
};
