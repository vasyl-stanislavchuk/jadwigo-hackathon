/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Wait_ChooseInputs */
/**
* | output |
* | --- |
* | "Tap one answer." |
*
* @param {Ds_Wait_ChooseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_choose: ((inputs?: Ds_Wait_ChooseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Wait_ChooseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Wait_ChooseInputs = {};
