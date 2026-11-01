/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Lesson_Draft_AboutInputs */
/**
* | output |
* | --- |
* | "Drafting a lesson on: {topic}" |
*
* @param {Chat_Tool_Lesson_Draft_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lesson_draft_about: ((inputs: Chat_Tool_Lesson_Draft_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lesson_Draft_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lesson_Draft_AboutInputs = {
    topic: NonNullable<unknown>;
};
