/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Target_MissedInputs */
/**
* | output |
* | --- |
* | "Not everything asked for was marked" |
*
* @param {Parent_Mistake_Target_MissedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_target_missed: ((inputs?: Parent_Mistake_Target_MissedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Target_MissedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Target_MissedInputs = {};
