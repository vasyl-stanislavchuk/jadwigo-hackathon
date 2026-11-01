/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_Fraction_BoxesInputs */
/**
* | output |
* | --- |
* | "Write the top and the bottom number." |
*
* @param {Incomplete_Fraction_BoxesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_fraction_boxes: ((inputs?: Incomplete_Fraction_BoxesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_Fraction_BoxesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_Fraction_BoxesInputs = {};
