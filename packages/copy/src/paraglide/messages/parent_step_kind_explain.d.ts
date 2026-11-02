/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_Kind_ExplainInputs */
/**
* | output |
* | --- |
* | "Explain" |
*
* @param {Parent_Step_Kind_ExplainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_explain: ((inputs?: Parent_Step_Kind_ExplainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_Kind_ExplainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_Kind_ExplainInputs = {};
