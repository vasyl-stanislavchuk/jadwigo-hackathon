/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Review_No_AnswerInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "No answer given. The right answer is below." |
* | * | "No answer this time. Here is how it goes." |
*
* @param {Review_No_AnswerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_no_answer: ((inputs: Review_No_AnswerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_No_AnswerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_No_AnswerInputs = {
    category: NonNullable<unknown>;
};
