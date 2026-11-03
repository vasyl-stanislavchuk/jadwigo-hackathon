/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Rating_OkInputs */
/**
* | output |
* | --- |
* | "just right" |
*
* @param {Rating_OkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const rating_ok: ((inputs?: Rating_OkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Rating_OkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Rating_OkInputs = {};
