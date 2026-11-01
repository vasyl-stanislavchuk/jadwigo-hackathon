/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ step: NonNullable<unknown> }} Chat_Lesson_StepInputs */
/**
* | output |
* | --- |
* | "Step {step}" |
*
* @param {Chat_Lesson_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_step: ((inputs: Chat_Lesson_StepInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_StepInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_StepInputs = {
    step: NonNullable<unknown>;
};
