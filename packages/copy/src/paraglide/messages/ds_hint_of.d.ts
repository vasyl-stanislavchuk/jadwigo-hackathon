/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, of: NonNullable<unknown> }} Ds_Hint_OfInputs */
/**
* | output |
* | --- |
* | "{n} of {of}" |
*
* @param {Ds_Hint_OfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_hint_of: ((inputs: Ds_Hint_OfInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Hint_OfInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Hint_OfInputs = {
    n: NonNullable<unknown>;
    of: NonNullable<unknown>;
};
