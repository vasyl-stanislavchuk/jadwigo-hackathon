/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Wait_EnterInputs */
/**
* | output |
* | --- |
* | "Type or say the result." |
*
* @param {Ds_Wait_EnterInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_enter: ((inputs?: Ds_Wait_EnterInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Wait_EnterInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Wait_EnterInputs = {};
