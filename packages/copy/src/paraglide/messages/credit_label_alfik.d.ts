/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_Label_AlfikInputs */
/**
* | output |
* | --- |
* | "From Alfik Matematyczny. See the source and license." |
*
* @param {Credit_Label_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_label_alfik: ((inputs?: Credit_Label_AlfikInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_Label_AlfikInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_Label_AlfikInputs = {};
