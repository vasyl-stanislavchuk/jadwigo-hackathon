/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Build_RectangleInputs */
/**
* | output |
* | --- |
* | "Build the rectangle" |
*
* @param {Build_RectangleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const build_rectangle: ((inputs?: Build_RectangleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Build_RectangleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Build_RectangleInputs = {};
