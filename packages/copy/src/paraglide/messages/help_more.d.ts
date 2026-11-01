/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Help_MoreInputs */
/**
* | output |
* | --- |
* | "More help" |
*
* @param {Help_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_more: ((inputs?: Help_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Help_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Help_MoreInputs = {};
