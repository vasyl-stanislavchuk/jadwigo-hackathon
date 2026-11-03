/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Rating_EasyInputs */
/**
* | output |
* | --- |
* | "too easy" |
*
* @param {Rating_EasyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const rating_easy: ((inputs?: Rating_EasyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Rating_EasyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Rating_EasyInputs = {};
