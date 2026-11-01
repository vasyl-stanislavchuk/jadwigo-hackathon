/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Column_R0Inputs */
/**
* | output |
* | --- |
* | "the answer’s ones" |
*
* @param {Column_R0Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_r0: ((inputs?: Column_R0Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Column_R0Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Column_R0Inputs = {};
