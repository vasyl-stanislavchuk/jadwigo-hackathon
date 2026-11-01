/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, unit: NonNullable<unknown> }} Picture_Stands_ForInputs */
/**
* | output |
* | --- |
* | "One picture stands for {n} {unit}" |
*
* @param {Picture_Stands_ForInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const picture_stands_for: ((inputs: Picture_Stands_ForInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Picture_Stands_ForInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Picture_Stands_ForInputs = {
    n: NonNullable<unknown>;
    unit: NonNullable<unknown>;
};
