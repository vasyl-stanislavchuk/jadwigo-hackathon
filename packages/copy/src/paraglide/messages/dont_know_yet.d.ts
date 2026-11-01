/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Dont_Know_YetInputs */
/**
* | output |
* | --- |
* | "I don't know yet" |
*
* @param {Dont_Know_YetInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const dont_know_yet: ((inputs?: Dont_Know_YetInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Dont_Know_YetInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Dont_Know_YetInputs = {};
