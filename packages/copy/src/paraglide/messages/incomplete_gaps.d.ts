/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_GapsInputs */
/**
* | output |
* | --- |
* | "Fill in the empty spaces too." |
*
* @param {Incomplete_GapsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_gaps: ((inputs?: Incomplete_GapsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_GapsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_GapsInputs = {};
