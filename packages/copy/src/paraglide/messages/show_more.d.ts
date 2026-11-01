/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Show_MoreInputs */
/**
* | output |
* | --- |
* | "Show more" |
*
* @param {Show_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const show_more: ((inputs?: Show_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Show_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Show_MoreInputs = {};
