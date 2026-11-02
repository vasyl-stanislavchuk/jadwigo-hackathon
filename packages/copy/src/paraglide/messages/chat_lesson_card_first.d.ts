/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ say: NonNullable<unknown> }} Chat_Lesson_Card_FirstInputs */
/**
* | output |
* | --- |
* | "First: {say}" |
*
* @param {Chat_Lesson_Card_FirstInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_card_first: ((inputs: Chat_Lesson_Card_FirstInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_Card_FirstInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_Card_FirstInputs = {
    say: NonNullable<unknown>;
};
