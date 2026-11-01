/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, total: NonNullable<unknown> }} Review_TitleInputs */
/**
* | output |
* | --- |
* | "Question {n} of {total}" |
*
* @param {Review_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_title: ((inputs: Review_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_TitleInputs = {
    n: NonNullable<unknown>;
    total: NonNullable<unknown>;
};
