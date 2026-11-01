/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ licence: NonNullable<unknown> }} Credit_BothInputs */
/**
* | output |
* | --- |
* | "Translated and adapted by Jadwigo under {licence}" |
*
* @param {Credit_BothInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_both: ((inputs: Credit_BothInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_BothInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_BothInputs = {
    licence: NonNullable<unknown>;
};
