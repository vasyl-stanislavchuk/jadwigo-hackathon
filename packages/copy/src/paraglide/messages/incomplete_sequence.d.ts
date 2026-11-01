/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Incomplete_SequenceInputs */
/**
* | output |
* | --- |
* | "Fill every place first." |
*
* @param {Incomplete_SequenceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const incomplete_sequence: ((inputs?: Incomplete_SequenceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Incomplete_SequenceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Incomplete_SequenceInputs = {};
