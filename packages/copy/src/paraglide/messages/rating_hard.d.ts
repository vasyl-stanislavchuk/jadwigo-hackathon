/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Rating_HardInputs */
/**
* | output |
* | --- |
* | "too hard" |
*
* @param {Rating_HardInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const rating_hard: ((inputs?: Rating_HardInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Rating_HardInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Rating_HardInputs = {};
