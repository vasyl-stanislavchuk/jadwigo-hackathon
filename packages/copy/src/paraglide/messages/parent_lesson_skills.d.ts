/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Lesson_SkillsInputs */
/**
* | output |
* | --- |
* | "What this lesson practises" |
*
* @param {Parent_Lesson_SkillsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_skills: ((inputs?: Parent_Lesson_SkillsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Lesson_SkillsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Lesson_SkillsInputs = {};
