/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Curriculum_TopicsInputs */
/**
* | output |
* | --- |
* | "Reading the school curriculum" |
*
* @param {Chat_Tool_Curriculum_TopicsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_curriculum_topics: ((inputs?: Chat_Tool_Curriculum_TopicsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Curriculum_TopicsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Curriculum_TopicsInputs = {};
