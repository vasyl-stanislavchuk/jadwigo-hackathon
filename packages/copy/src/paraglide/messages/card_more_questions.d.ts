/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Card_More_QuestionsInputs */
/**
* | output |
* | --- |
* | "+{n} more" |
*
* @param {Card_More_QuestionsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const card_more_questions: ((inputs: Card_More_QuestionsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Card_More_QuestionsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Card_More_QuestionsInputs = {
    n: NonNullable<unknown>;
};
