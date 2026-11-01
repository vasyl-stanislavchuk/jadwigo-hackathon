/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ source: NonNullable<unknown> }} Credit_FromInputs */
/**
* | output |
* | --- |
* | "from {source}" |
*
* @param {Credit_FromInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_from: ((inputs: Credit_FromInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_FromInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_FromInputs = {
    source: NonNullable<unknown>;
};
