/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Parent_Grade_AgeInputs */
/**
* | output |
* | --- |
* | "ages {from}–{to}" |
*
* @param {Parent_Grade_AgeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_grade_age: ((inputs: Parent_Grade_AgeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Grade_AgeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Grade_AgeInputs = {
    from: NonNullable<unknown>;
    to: NonNullable<unknown>;
};
