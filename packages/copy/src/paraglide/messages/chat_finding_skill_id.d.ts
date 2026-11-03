/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Skill_IdInputs */
/**
* | output |
* | --- |
* | "A skill has a name the lesson doesn't recognise." |
*
* @param {Chat_Finding_Skill_IdInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_skill_id: ((inputs?: Chat_Finding_Skill_IdInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Skill_IdInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Skill_IdInputs = {};
