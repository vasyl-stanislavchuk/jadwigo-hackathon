/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Parent_New_Lesson_ForInputs */
/**
* | output |
* | --- |
* | "New lesson for {name}" |
*
* @param {Parent_New_Lesson_ForInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_new_lesson_for: ((inputs: Parent_New_Lesson_ForInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_New_Lesson_ForInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_New_Lesson_ForInputs = {
    name: NonNullable<unknown>;
};
