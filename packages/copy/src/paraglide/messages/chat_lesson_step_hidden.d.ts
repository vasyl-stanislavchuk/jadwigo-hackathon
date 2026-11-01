/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ step: NonNullable<unknown> }} Chat_Lesson_Step_HiddenInputs */
/**
* | output |
* | --- |
* | "Step {step} can't be shown yet." |
*
* @param {Chat_Lesson_Step_HiddenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_step_hidden: ((inputs: Chat_Lesson_Step_HiddenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_Step_HiddenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_Step_HiddenInputs = {
    step: NonNullable<unknown>;
};
