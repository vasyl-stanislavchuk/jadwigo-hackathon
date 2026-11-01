/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Written_In_PlInputs */
/**
* | output |
* | --- |
* | "This item is in Polish." |
*
* @param {Written_In_PlInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const written_in_pl: ((inputs?: Written_In_PlInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Written_In_PlInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Written_In_PlInputs = {};
