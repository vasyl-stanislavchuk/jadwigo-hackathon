/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} DoneInputs */
/**
* | output |
* | --- |
* | "Done" |
*
* @param {DoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const done: ((inputs?: DoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<DoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type DoneInputs = {};
