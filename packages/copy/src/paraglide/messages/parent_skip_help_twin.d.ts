/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Skip_Help_TwinInputs */
/**
* | output |
* | --- |
* | "After help: a similar question" |
*
* @param {Parent_Skip_Help_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_help_twin: ((inputs?: Parent_Skip_Help_TwinInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Skip_Help_TwinInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Skip_Help_TwinInputs = {};
