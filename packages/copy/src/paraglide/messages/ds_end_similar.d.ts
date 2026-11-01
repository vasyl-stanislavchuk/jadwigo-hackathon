/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_End_SimilarInputs */
/**
* | output |
* | --- |
* | "Similar ones to practise" |
*
* @param {Ds_End_SimilarInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_end_similar: ((inputs?: Ds_End_SimilarInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_End_SimilarInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_End_SimilarInputs = {};
