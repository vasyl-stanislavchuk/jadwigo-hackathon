/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Question_Search_AboutInputs */
/**
* | output |
* | --- |
* | "Looking for questions about {topic}" |
*
* @param {Chat_Tool_Question_Search_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_question_search_about: ((inputs: Chat_Tool_Question_Search_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Question_Search_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Question_Search_AboutInputs = {
    topic: NonNullable<unknown>;
};
