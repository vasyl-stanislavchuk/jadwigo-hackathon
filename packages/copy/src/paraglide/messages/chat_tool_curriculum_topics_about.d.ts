/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ topic: NonNullable<unknown> }} Chat_Tool_Curriculum_Topics_AboutInputs */
/**
* | output |
* | --- |
* | "Reading the curriculum on {topic}" |
*
* @param {Chat_Tool_Curriculum_Topics_AboutInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_curriculum_topics_about: ((inputs: Chat_Tool_Curriculum_Topics_AboutInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Curriculum_Topics_AboutInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Curriculum_Topics_AboutInputs = {
    topic: NonNullable<unknown>;
};
