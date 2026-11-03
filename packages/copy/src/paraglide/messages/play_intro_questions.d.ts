/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Play_Intro_QuestionsInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question" |
* | "other" | "{n} questions" |
*
* @param {Play_Intro_QuestionsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_intro_questions: ((inputs: Play_Intro_QuestionsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Intro_QuestionsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Intro_QuestionsInputs = {
    n: NonNullable<unknown>;
};
