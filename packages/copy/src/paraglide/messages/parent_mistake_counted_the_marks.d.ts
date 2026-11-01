/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Counted_The_MarksInputs */
/**
* | output |
* | --- |
* | "The marks counted instead of the spaces" |
*
* @param {Parent_Mistake_Counted_The_MarksInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_counted_the_marks: ((inputs?: Parent_Mistake_Counted_The_MarksInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Counted_The_MarksInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Counted_The_MarksInputs = {};
