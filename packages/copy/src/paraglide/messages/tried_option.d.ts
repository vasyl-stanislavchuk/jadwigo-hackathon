/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Tried_OptionInputs */
/**
* | output |
* | --- |
* | "tried" |
*
* @param {Tried_OptionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const tried_option: ((inputs?: Tried_OptionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Tried_OptionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Tried_OptionInputs = {};
