/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Learner_SkillsInputs */
/**
* | output |
* | --- |
* | "Reading the learner's goals" |
*
* @param {Chat_Tool_Learner_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_learner_skills: ((inputs?: Chat_Tool_Learner_SkillsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Learner_SkillsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Learner_SkillsInputs = {};
