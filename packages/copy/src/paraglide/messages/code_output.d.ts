/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Code_OutputInputs */
/**
* | output |
* | --- |
* | "Output" |
*
* @param {Code_OutputInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_output: ((inputs?: Code_OutputInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Code_OutputInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Code_OutputInputs = {};
