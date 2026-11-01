/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Crumb_ResultInputs */
/**
* | output |
* | --- |
* | "Lesson result" |
*
* @param {Parent_Crumb_ResultInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_crumb_result: ((inputs?: Parent_Crumb_ResultInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Crumb_ResultInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Crumb_ResultInputs = {};
