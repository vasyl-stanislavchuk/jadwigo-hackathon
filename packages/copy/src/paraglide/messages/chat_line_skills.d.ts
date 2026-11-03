/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Line_SkillsInputs */
/**
* | output |
* | --- |
* | "Looked at the skills" |
*
* @param {Chat_Line_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_skills: ((inputs?: Chat_Line_SkillsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_SkillsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_SkillsInputs = {};
