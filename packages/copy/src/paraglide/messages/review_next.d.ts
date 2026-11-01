/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Review_NextInputs */
/**
* | output |
* | --- |
* | "Next" |
*
* @param {Review_NextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_next: ((inputs?: Review_NextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_NextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_NextInputs = {};
