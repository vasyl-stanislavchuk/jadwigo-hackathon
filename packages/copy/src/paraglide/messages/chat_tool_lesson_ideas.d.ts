/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Lesson_IdeasInputs */
/**
* | output |
* | --- |
* | "Finding ideas for the next lesson" |
*
* @param {Chat_Tool_Lesson_IdeasInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_ideas: ((inputs?: Chat_Tool_Lesson_IdeasInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_IdeasInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_IdeasInputs = {};
