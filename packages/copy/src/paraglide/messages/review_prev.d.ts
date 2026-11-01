/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Review_PrevInputs */
/**
* | output |
* | --- |
* | "Previous" |
*
* @param {Review_PrevInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_prev: ((inputs?: Review_PrevInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_PrevInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_PrevInputs = {};
