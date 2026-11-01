/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Outcome_OpenInputs */
/**
* | output |
* | --- |
* | "Still open" |
*
* @param {Parent_Outcome_OpenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_open: ((inputs?: Parent_Outcome_OpenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Outcome_OpenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Outcome_OpenInputs = {};
