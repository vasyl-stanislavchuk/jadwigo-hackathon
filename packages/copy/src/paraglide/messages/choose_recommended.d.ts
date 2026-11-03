/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Choose_RecommendedInputs */
/**
* | output |
* | --- |
* | "recommended" |
*
* @param {Choose_RecommendedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const choose_recommended: ((inputs?: Choose_RecommendedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Choose_RecommendedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Choose_RecommendedInputs = {};
