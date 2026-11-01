/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Written_In_EnInputs */
/**
* | output |
* | --- |
* | "This item is in English" |
*
* @param {Written_In_EnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const written_in_en: ((inputs?: Written_In_EnInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Written_In_EnInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Written_In_EnInputs = {};
