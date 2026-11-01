/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Lesson_EmptyInputs */
/**
* | output |
* | --- |
* | "The lesson appears here." |
*
* @param {Chat_Lesson_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_empty: ((inputs?: Chat_Lesson_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_EmptyInputs = {};
