/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Mistakes_AnswersInputs */
/**
* | output |
* | --- |
* | "The child's answers" |
*
* @param {Chat_Mistakes_AnswersInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_mistakes_answers: ((inputs?: Chat_Mistakes_AnswersInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Mistakes_AnswersInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Mistakes_AnswersInputs = {};
