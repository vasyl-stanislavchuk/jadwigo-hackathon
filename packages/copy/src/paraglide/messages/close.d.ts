/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} CloseInputs */
/**
* | output |
* | --- |
* | "Close" |
*
* @param {CloseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const close: ((inputs?: CloseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<CloseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type CloseInputs = {};
