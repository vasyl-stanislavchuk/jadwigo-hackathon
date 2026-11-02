/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Step_DropInputs */
/**
* | output |
* | --- |
* | "Remove" |
*
* @param {Parent_Step_DropInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_step_drop: ((inputs?: Parent_Step_DropInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Step_DropInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Step_DropInputs = {};
