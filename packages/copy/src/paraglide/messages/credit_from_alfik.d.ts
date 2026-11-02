/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_From_AlfikInputs */
/**
* | output |
* | --- |
* | "from Alfik Matematyczny" |
*
* @param {Credit_From_AlfikInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_from_alfik: ((inputs?: Credit_From_AlfikInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_From_AlfikInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_From_AlfikInputs = {};
