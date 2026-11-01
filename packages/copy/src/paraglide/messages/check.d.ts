/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} CheckInputs */
/**
* | output |
* | --- |
* | "Check" |
*
* @param {CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const check: ((inputs?: CheckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<CheckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type CheckInputs = {};
