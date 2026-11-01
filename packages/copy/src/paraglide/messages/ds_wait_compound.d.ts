/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Wait_CompoundInputs */
/**
* | output |
* | --- |
* | "Answer both parts." |
*
* @param {Ds_Wait_CompoundInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_compound: ((inputs?: Ds_Wait_CompoundInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Wait_CompoundInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Wait_CompoundInputs = {};
