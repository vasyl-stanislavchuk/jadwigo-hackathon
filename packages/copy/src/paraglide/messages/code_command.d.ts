/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Code_CommandInputs */
/**
* | output |
* | --- |
* | "Command" |
*
* @param {Code_CommandInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_command: ((inputs?: Code_CommandInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Code_CommandInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Code_CommandInputs = {};
