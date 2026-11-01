/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Child_Lessons_EmptyInputs */
/**
* | output |
* | --- |
* | "The lessons given to this child will appear here." |
*
* @param {Parent_Child_Lessons_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_lessons_empty: ((inputs?: Parent_Child_Lessons_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Child_Lessons_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Child_Lessons_EmptyInputs = {};
