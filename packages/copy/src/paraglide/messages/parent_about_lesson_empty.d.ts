/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_About_Lesson_EmptyInputs */
/**
* | output |
* | --- |
* | "The source, the steps, the version and the change history will appear here once the lesson is ready." |
*
* @param {Parent_About_Lesson_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_about_lesson_empty: ((inputs?: Parent_About_Lesson_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_About_Lesson_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_About_Lesson_EmptyInputs = {};
