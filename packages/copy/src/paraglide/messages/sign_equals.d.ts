/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Sign_EqualsInputs */
/**
* | output |
* | --- |
* | "Equals" |
*
* @param {Sign_EqualsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sign_equals: ((inputs?: Sign_EqualsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Sign_EqualsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Sign_EqualsInputs = {};
