/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Lesson_ShowInputs */
/**
* | output |
* | --- |
* | "Show the lesson" |
*
* @param {Parent_Lesson_ShowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_show: ((inputs?: Parent_Lesson_ShowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Lesson_ShowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Lesson_ShowInputs = {};
