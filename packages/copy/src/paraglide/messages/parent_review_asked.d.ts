/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Review_AskedInputs */
/**
* | output |
* | --- |
* | "Questions asked: {n}" |
*
* @param {Parent_Review_AskedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_review_asked: ((inputs: Parent_Review_AskedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Review_AskedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Review_AskedInputs = {
    n: NonNullable<unknown>;
};
