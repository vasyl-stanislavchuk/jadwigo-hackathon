/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Lesson_UnreadableInputs */
/**
* | output |
* | --- |
* | "This revision can't be shown yet." |
*
* @param {Chat_Lesson_UnreadableInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_unreadable: ((inputs?: Chat_Lesson_UnreadableInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_UnreadableInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_UnreadableInputs = {};
