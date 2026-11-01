/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Letters_CapitalsInputs */
/**
* | output |
* | --- |
* | "Capital letters" |
*
* @param {Letters_CapitalsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const letters_capitals: ((inputs?: Letters_CapitalsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Letters_CapitalsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Letters_CapitalsInputs = {};
