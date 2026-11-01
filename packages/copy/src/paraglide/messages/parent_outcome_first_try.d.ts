/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Outcome_First_TryInputs */
/**
* | output |
* | --- |
* | "First try" |
*
* @param {Parent_Outcome_First_TryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_outcome_first_try: ((inputs?: Parent_Outcome_First_TryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Outcome_First_TryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Outcome_First_TryInputs = {};
