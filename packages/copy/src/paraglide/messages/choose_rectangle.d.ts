/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Choose_RectangleInputs */
/**
* | output |
* | --- |
* | "Choose the rectangle" |
*
* @param {Choose_RectangleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const choose_rectangle: ((inputs?: Choose_RectangleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Choose_RectangleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Choose_RectangleInputs = {};
