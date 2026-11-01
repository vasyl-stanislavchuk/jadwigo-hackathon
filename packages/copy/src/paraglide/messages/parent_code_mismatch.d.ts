/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Code_MismatchInputs */
/**
* | output |
* | --- |
* | "That code does not match. Check the email and type it again." |
*
* @param {Parent_Code_MismatchInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_code_mismatch: ((inputs?: Parent_Code_MismatchInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Code_MismatchInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Code_MismatchInputs = {};
