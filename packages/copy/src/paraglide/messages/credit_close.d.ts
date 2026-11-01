/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Credit_CloseInputs */
/**
* | output |
* | --- |
* | "Close" |
*
* @param {Credit_CloseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_close: ((inputs?: Credit_CloseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_CloseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_CloseInputs = {};
