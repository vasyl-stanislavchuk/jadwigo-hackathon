/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Letters_RowInputs */
/**
* | output |
* | --- |
* | "Polish letters" |
*
* @param {Letters_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const letters_row: ((inputs?: Letters_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Letters_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Letters_RowInputs = {};
