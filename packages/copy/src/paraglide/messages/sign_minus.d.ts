/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Sign_MinusInputs */
/**
* | output |
* | --- |
* | "Minus" |
*
* @param {Sign_MinusInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sign_minus: ((inputs?: Sign_MinusInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Sign_MinusInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Sign_MinusInputs = {};
