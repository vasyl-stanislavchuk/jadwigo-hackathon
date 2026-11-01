/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Lesson_Skills_EmptyInputs */
/**
* | output |
* | --- |
* | "The skills this lesson practises will appear here once it is ready." |
*
* @param {Parent_Lesson_Skills_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_skills_empty: ((inputs?: Parent_Lesson_Skills_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Lesson_Skills_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Lesson_Skills_EmptyInputs = {};
