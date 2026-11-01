/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Code_PlaceholderInputs */
/**
* | output |
* | --- |
* | "Type the id bd printed in place of the part in angle brackets" |
*
* @param {Code_PlaceholderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const code_placeholder: ((inputs?: Code_PlaceholderInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Code_PlaceholderInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Code_PlaceholderInputs = {};
