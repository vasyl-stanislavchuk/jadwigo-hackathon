/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} CheckingInputs */
/**
* | output |
* | --- |
* | "Checking…" |
*
* @param {CheckingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const checking: ((inputs?: CheckingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<CheckingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type CheckingInputs = {};
