/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} BlankInputs */
/**
* | output |
* | --- |
* | "Missing number" |
*
* @param {BlankInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const blank: ((inputs?: BlankInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<BlankInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type BlankInputs = {};
