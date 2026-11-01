/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ licence: NonNullable<unknown> }} Credit_SharedInputs */
/**
* | output |
* | --- |
* | "Shared under {licence}" |
*
* @param {Credit_SharedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_shared: ((inputs: Credit_SharedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_SharedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_SharedInputs = {
    licence: NonNullable<unknown>;
};
