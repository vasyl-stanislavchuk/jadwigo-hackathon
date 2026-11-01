/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Ds_End_AgainInputs */
/**
* | output |
* | --- |
* | "The tricky ones again ({n})" |
*
* @param {Ds_End_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_end_again: ((inputs: Ds_End_AgainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_End_AgainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_End_AgainInputs = {
    n: NonNullable<unknown>;
};
