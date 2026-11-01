/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ licence: NonNullable<unknown> }} Credit_AdaptedInputs */
/**
* | output |
* | --- |
* | "Adapted by Jadwigo under {licence}" |
*
* @param {Credit_AdaptedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_adapted: ((inputs: Credit_AdaptedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_AdaptedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_AdaptedInputs = {
    licence: NonNullable<unknown>;
};
