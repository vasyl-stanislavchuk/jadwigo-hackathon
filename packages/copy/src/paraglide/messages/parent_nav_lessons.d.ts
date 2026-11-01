/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Nav_LessonsInputs */
/**
* | output |
* | --- |
* | "Lessons" |
*
* @param {Parent_Nav_LessonsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_nav_lessons: ((inputs?: Parent_Nav_LessonsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Nav_LessonsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Nav_LessonsInputs = {};
