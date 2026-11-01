/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} NoInputs */
/**
* | output |
* | --- |
* | "No" |
*
* @param {NoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const no: ((inputs?: NoInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<NoInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type NoInputs = {};
