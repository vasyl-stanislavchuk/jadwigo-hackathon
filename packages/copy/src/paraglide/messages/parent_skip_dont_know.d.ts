/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Skip_Dont_KnowInputs */
/**
* | output |
* | --- |
* | "Didn't know yet" |
*
* @param {Parent_Skip_Dont_KnowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_skip_dont_know: ((inputs?: Parent_Skip_Dont_KnowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Skip_Dont_KnowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Skip_Dont_KnowInputs = {};
