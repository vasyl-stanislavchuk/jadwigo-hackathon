/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Review_AllInputs */
/**
* | output |
* | --- |
* | "All questions" |
*
* @param {Review_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_all: ((inputs?: Review_AllInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_AllInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_AllInputs = {};
