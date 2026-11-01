/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Lesson_ChangedInputs */
/**
* | output |
* | --- |
* | "The lesson changed" |
*
* @param {Chat_Lesson_ChangedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_changed: ((inputs?: Chat_Lesson_ChangedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_ChangedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_ChangedInputs = {};
