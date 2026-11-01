/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Goal_Status_Needs_AttentionInputs */
/**
* | output |
* | --- |
* | "Needs attention" |
*
* @param {Parent_Goal_Status_Needs_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_needs_attention: ((inputs?: Parent_Goal_Status_Needs_AttentionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Goal_Status_Needs_AttentionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Goal_Status_Needs_AttentionInputs = {};
