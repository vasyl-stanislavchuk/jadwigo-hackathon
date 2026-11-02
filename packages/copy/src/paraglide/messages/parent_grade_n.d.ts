/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ grade: NonNullable<unknown> }} Parent_Grade_NInputs */
/**
* | output |
* | --- |
* | "grade {grade}" |
*
* @param {Parent_Grade_NInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_grade_n: ((inputs: Parent_Grade_NInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Grade_NInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Grade_NInputs = {
    grade: NonNullable<unknown>;
};
