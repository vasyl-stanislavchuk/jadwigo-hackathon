/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_Kind_EnterInputs */
/**
* | output |
* | --- |
* | "Type" |
*
* @param {Parent_Step_Kind_EnterInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_enter: ((inputs?: Parent_Step_Kind_EnterInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_Kind_EnterInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_Kind_EnterInputs = {};
