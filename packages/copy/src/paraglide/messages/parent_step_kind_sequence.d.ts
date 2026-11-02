/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_Kind_SequenceInputs */
/**
* | output |
* | --- |
* | "Put in order" |
*
* @param {Parent_Step_Kind_SequenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_kind_sequence: ((inputs?: Parent_Step_Kind_SequenceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_Kind_SequenceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_Kind_SequenceInputs = {};
