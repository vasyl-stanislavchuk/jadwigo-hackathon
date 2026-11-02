/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ name: NonNullable<unknown> }} Parent_New_Lesson_ChildInputs */
/**
* | output |
* | --- |
* | "New lesson · {name}" |
*
* @param {Parent_New_Lesson_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_new_lesson_child: ((inputs: Parent_New_Lesson_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_New_Lesson_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_New_Lesson_ChildInputs = {
    name: NonNullable<unknown>;
};
