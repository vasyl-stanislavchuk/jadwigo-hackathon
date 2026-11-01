/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Review_Right_AnswerInputs */
/**
* | output |
* | --- |
* | "This is what the right answer looks like." |
*
* @param {Review_Right_AnswerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_right_answer: ((inputs?: Review_Right_AnswerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_Right_AnswerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_Right_AnswerInputs = {};
