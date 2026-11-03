/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Phase_Thinking_LessonInputs */
/**
* | output |
* | --- |
* | "Thinking about the lesson" |
*
* @param {Chat_Phase_Thinking_LessonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_thinking_lesson: ((inputs?: Chat_Phase_Thinking_LessonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Thinking_LessonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Thinking_LessonInputs = {};
