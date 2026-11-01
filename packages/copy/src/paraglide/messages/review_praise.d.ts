/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Review_PraiseInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "Why it is right:" |
* | * | "Well done! Here is why:" |
*
* @param {Review_PraiseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const review_praise: ((inputs: Review_PraiseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Review_PraiseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Review_PraiseInputs = {
    category: NonNullable<unknown>;
};
