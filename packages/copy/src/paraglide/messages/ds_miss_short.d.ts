/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Miss_ShortInputs */
/**
* | output |
* | --- |
* | "Not yet." |
*
* @param {Ds_Miss_ShortInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_miss_short: ((inputs?: Ds_Miss_ShortInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Miss_ShortInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Miss_ShortInputs = {};
