/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ grade: NonNullable<unknown> }} Parent_Child_GradeInputs */
/**
* | output |
* | --- |
* | "Year {grade}" |
*
* @param {Parent_Child_GradeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_child_grade: ((inputs: Parent_Child_GradeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Child_GradeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Child_GradeInputs = {
    grade: NonNullable<unknown>;
};
