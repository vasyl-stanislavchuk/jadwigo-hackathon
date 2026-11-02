/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Context_LessonInputs */
/**
* | output |
* | --- |
* | "Jadwigo AI sees: this lesson" |
*
* @param {Chat_Context_LessonInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_context_lesson: ((inputs?: Chat_Context_LessonInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Context_LessonInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Context_LessonInputs = {};
