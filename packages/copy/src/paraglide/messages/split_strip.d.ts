/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Split_StripInputs */
/**
* | output |
* | --- |
* | "Where to split the rectangle" |
*
* @param {Split_StripInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const split_strip: ((inputs?: Split_StripInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Split_StripInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Split_StripInputs = {};
