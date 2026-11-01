/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Wait_GapsInputs */
/**
* | output |
* | --- |
* | "Fill in every digit of the result." |
*
* @param {Ds_Wait_GapsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_gaps: ((inputs?: Ds_Wait_GapsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Wait_GapsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Wait_GapsInputs = {};
