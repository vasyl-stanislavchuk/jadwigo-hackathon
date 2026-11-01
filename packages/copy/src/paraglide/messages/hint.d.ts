/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} HintInputs */
/**
* | output |
* | --- |
* | "A hint" |
*
* @param {HintInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const hint: ((inputs?: HintInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<HintInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type HintInputs = {};
