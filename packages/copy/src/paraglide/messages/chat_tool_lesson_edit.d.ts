/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Lesson_EditInputs */
/**
* | output |
* | --- |
* | "Changing the lesson" |
*
* @param {Chat_Tool_Lesson_EditInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_edit: ((inputs?: Chat_Tool_Lesson_EditInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_EditInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_EditInputs = {};
