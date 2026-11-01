/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ step: NonNullable<unknown> }} Chat_Tool_Lesson_Show_StepInputs */
/**
* | output |
* | --- |
* | "Reading step {step}" |
*
* @param {Chat_Tool_Lesson_Show_StepInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_show_step: ((inputs: Chat_Tool_Lesson_Show_StepInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_Show_StepInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_Show_StepInputs = {
    step: NonNullable<unknown>;
};
