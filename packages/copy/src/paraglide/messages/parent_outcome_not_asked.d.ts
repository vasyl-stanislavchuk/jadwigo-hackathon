/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Outcome_Not_AskedInputs */
/**
* | output |
* | --- |
* | "Not asked" |
*
* @param {Parent_Outcome_Not_AskedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_not_asked: ((inputs?: Parent_Outcome_Not_AskedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Outcome_Not_AskedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Outcome_Not_AskedInputs = {};
