/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, d: NonNullable<unknown> }} Fraction_PartInputs */
/**
* | output |
* | --- |
* | "Part {n} of {d}" |
*
* @param {Fraction_PartInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_part: ((inputs: Fraction_PartInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_PartInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_PartInputs = {
    n: NonNullable<unknown>;
    d: NonNullable<unknown>;
};
