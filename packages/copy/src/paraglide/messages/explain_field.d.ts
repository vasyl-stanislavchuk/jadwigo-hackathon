/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Explain_FieldInputs */
/**
* | output |
* | --- |
* | "Your explanation" |
*
* @param {Explain_FieldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const explain_field: ((inputs?: Explain_FieldInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Explain_FieldInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Explain_FieldInputs = {};
