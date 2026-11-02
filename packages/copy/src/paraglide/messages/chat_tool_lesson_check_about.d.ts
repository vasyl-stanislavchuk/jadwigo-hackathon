/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ title: NonNullable<unknown> }} Chat_Tool_Lesson_Check_AboutInputs */
/**
* | output |
* | --- |
* | "Checking the lesson: {title}" |
*
* @param {Chat_Tool_Lesson_Check_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_check_about: ((inputs: Chat_Tool_Lesson_Check_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_Check_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_Check_AboutInputs = {
    title: NonNullable<unknown>;
};
