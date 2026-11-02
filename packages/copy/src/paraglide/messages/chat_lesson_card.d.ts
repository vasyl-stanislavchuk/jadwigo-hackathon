/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Lesson_CardInputs */
/**
* | output |
* | --- |
* | "Lesson ready" |
*
* @param {Chat_Lesson_CardInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card: ((inputs?: Chat_Lesson_CardInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_CardInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_CardInputs = {};
