/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Skip_Asked_To_SkipInputs */
/**
* | output |
* | --- |
* | "Moved on without answering" |
*
* @param {Parent_Skip_Asked_To_SkipInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_asked_to_skip: ((inputs?: Parent_Skip_Asked_To_SkipInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Skip_Asked_To_SkipInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Skip_Asked_To_SkipInputs = {};
