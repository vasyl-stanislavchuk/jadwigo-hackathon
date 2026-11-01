/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Sign_PlusInputs */
/**
* | output |
* | --- |
* | "Plus" |
*
* @param {Sign_PlusInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const sign_plus: ((inputs?: Sign_PlusInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Sign_PlusInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Sign_PlusInputs = {};
