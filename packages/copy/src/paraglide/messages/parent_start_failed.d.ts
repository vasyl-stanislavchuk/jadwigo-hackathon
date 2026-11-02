/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Start_FailedInputs */
/**
* | output |
* | --- |
* | "The lesson didn't start. Try again." |
*
* @param {Parent_Start_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_start_failed: ((inputs?: Parent_Start_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Start_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Start_FailedInputs = {};
