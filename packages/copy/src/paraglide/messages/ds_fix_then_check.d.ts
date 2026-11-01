/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Fix_Then_CheckInputs */
/**
* | output |
* | --- |
* | "Fix the marked place, then check." |
*
* @param {Ds_Fix_Then_CheckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_fix_then_check: ((inputs?: Ds_Fix_Then_CheckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Fix_Then_CheckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Fix_Then_CheckInputs = {};
