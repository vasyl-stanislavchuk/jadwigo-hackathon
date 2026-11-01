/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Lesson_RevisionInputs */
/**
* | output |
* | --- |
* | "Revision {n}" |
*
* @param {Chat_Lesson_RevisionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_lesson_revision: ((inputs: Chat_Lesson_RevisionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Lesson_RevisionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Lesson_RevisionInputs = {
    n: NonNullable<unknown>;
};
