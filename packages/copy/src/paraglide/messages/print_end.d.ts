/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_EndInputs */
/**
* | output |
* | --- |
* | "The end!" |
*
* @param {Print_EndInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_end: ((inputs?: Print_EndInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_EndInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_EndInputs = {};
