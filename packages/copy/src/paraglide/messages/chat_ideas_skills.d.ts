/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Ideas_SkillsInputs */
/**
* | count_noun | output |
* | --- | --- |
* | "one" | "{n} skill" |
* | "other" | "{n} skills" |
*
* @param {Chat_Ideas_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_ideas_skills: ((inputs: Chat_Ideas_SkillsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Ideas_SkillsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Ideas_SkillsInputs = {
    n: NonNullable<unknown>;
};
