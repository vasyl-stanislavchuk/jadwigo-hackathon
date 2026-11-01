/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Column_C2Inputs */
/**
* | output |
* | --- |
* | "the small box in the hundreds column" |
*
* @param {Column_C2Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_c2: ((inputs?: Column_C2Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Column_C2Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Column_C2Inputs = {};
