/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Column_C1Inputs */
/**
* | output |
* | --- |
* | "the small box in the tens column" |
*
* @param {Column_C1Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_c1: ((inputs?: Column_C1Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Column_C1Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Column_C1Inputs = {};
