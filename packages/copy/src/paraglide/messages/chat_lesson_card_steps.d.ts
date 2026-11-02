/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Lesson_Card_StepsInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "{n} question" |
* | "other" | "{n} questions" |
*
* @param {Chat_Lesson_Card_StepsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_steps: ((inputs: Chat_Lesson_Card_StepsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_Card_StepsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_Card_StepsInputs = {
    n: NonNullable<unknown>;
};
