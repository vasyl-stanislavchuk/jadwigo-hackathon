/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Lesson_DraftInputs */
/**
* | output |
* | --- |
* | "Drafting the lesson" |
*
* @param {Chat_Tool_Lesson_DraftInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_draft: ((inputs?: Chat_Tool_Lesson_DraftInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_DraftInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_DraftInputs = {};
