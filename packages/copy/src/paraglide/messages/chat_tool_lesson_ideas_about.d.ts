/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ child: NonNullable<unknown> }} Chat_Tool_Lesson_Ideas_AboutInputs */
/**
* | output |
* | --- |
* | "Finding lesson ideas · {child}" |
*
* @param {Chat_Tool_Lesson_Ideas_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_ideas_about: ((inputs: Chat_Tool_Lesson_Ideas_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_Ideas_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_Ideas_AboutInputs = {
    child: NonNullable<unknown>;
};
