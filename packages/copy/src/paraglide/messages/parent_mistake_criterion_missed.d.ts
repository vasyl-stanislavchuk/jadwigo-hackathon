/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Criterion_MissedInputs */
/**
* | output |
* | --- |
* | "One of the conditions left out" |
*
* @param {Parent_Mistake_Criterion_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_criterion_missed: ((inputs?: Parent_Mistake_Criterion_MissedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Criterion_MissedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Criterion_MissedInputs = {};
