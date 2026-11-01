/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Choose_AllInputs */
/**
* | output |
* | --- |
* | "Pick every one that fits." |
*
* @param {Choose_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const choose_all: ((inputs?: Choose_AllInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Choose_AllInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Choose_AllInputs = {};
