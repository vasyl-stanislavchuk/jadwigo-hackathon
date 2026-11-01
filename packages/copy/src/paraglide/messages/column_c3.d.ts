/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Column_C3Inputs */
/**
* | output |
* | --- |
* | "the small box in the thousands column" |
*
* @param {Column_C3Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_c3: ((inputs?: Column_C3Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Column_C3Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Column_C3Inputs = {};
