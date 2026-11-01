/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Column_R3Inputs */
/**
* | output |
* | --- |
* | "the answer’s thousands" |
*
* @param {Column_R3Inputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const column_r3: ((inputs?: Column_R3Inputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Column_R3Inputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Column_R3Inputs = {};
