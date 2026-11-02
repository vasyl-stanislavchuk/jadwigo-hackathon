/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_Kind_GroupInputs */
/**
* | output |
* | --- |
* | "Sort" |
*
* @param {Parent_Step_Kind_GroupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_group: ((inputs?: Parent_Step_Kind_GroupInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_Kind_GroupInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_Kind_GroupInputs = {};
