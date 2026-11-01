/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ d: NonNullable<unknown> }} Fraction_ShapeInputs */
/**
* | output |
* | --- |
* | "A shape cut into {d} equal parts" |
*
* @param {Fraction_ShapeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const fraction_shape: ((inputs: Fraction_ShapeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Fraction_ShapeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Fraction_ShapeInputs = {
    d: NonNullable<unknown>;
};
