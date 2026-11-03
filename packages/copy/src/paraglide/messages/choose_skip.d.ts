/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Choose_SkipInputs */
/**
* | output |
* | --- |
* | "Skip question" |
*
* @param {Choose_SkipInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const choose_skip: ((inputs?: Choose_SkipInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Choose_SkipInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Choose_SkipInputs = {};
