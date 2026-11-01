/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Sign_DivideInputs */
/**
* | output |
* | --- |
* | "Divided by" |
*
* @param {Sign_DivideInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sign_divide: ((inputs?: Sign_DivideInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Sign_DivideInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Sign_DivideInputs = {};
