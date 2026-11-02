/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Lesson_Card_OpenInputs */
/**
* | output |
* | --- |
* | "Open" |
*
* @param {Chat_Lesson_Card_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_open: ((inputs?: Chat_Lesson_Card_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_Card_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_Card_OpenInputs = {};
