/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Help_AlmostInputs */
/**
* | output |
* | --- |
* | "Almost there: you write the last line" |
*
* @param {Help_AlmostInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_almost: ((inputs?: Help_AlmostInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Help_AlmostInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Help_AlmostInputs = {};
