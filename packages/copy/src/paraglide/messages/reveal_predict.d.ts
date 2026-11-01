/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Reveal_PredictInputs */
/**
* | output |
* | --- |
* | "What do you think comes next?" |
*
* @param {Reveal_PredictInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const reveal_predict: ((inputs?: Reveal_PredictInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Reveal_PredictInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Reveal_PredictInputs = {};
