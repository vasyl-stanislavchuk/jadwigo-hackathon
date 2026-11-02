/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_Kind_ChooseInputs */
/**
* | output |
* | --- |
* | "Pick" |
*
* @param {Parent_Step_Kind_ChooseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_choose: ((inputs?: Parent_Step_Kind_ChooseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_Kind_ChooseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_Kind_ChooseInputs = {};
