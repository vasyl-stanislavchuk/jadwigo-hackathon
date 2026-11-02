/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Lesson_UntitledInputs */
/**
* | output |
* | --- |
* | "Untitled lesson" |
*
* @param {Parent_Lesson_UntitledInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_untitled: ((inputs?: Parent_Lesson_UntitledInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Lesson_UntitledInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Lesson_UntitledInputs = {};
