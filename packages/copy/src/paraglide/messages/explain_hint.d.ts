/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Explain_HintInputs */
/**
* | output |
* | --- |
* | "A sentence or two is enough." |
*
* @param {Explain_HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const explain_hint: ((inputs?: Explain_HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Explain_HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Explain_HintInputs = {};
