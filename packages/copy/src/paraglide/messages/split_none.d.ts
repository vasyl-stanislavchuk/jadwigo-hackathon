/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Split_NoneInputs */
/**
* | output |
* | --- |
* | "The rectangle is not split yet." |
*
* @param {Split_NoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const split_none: ((inputs?: Split_NoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Split_NoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Split_NoneInputs = {};
