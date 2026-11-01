/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Outcome_Got_ThereInputs */
/**
* | output |
* | --- |
* | "After tries or help" |
*
* @param {Parent_Outcome_Got_ThereInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_got_there: ((inputs?: Parent_Outcome_Got_ThereInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Outcome_Got_ThereInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Outcome_Got_ThereInputs = {};
