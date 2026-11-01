/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} EraseInputs */
/**
* | output |
* | --- |
* | "Delete" |
*
* @param {EraseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const erase: ((inputs?: EraseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<EraseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type EraseInputs = {};
