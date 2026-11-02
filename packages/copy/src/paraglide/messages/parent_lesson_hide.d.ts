/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Lesson_HideInputs */
/**
* | output |
* | --- |
* | "Hide the lesson" |
*
* @param {Parent_Lesson_HideInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_lesson_hide: ((inputs?: Parent_Lesson_HideInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Lesson_HideInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Lesson_HideInputs = {};
