/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ source: NonNullable<unknown> }} Credit_SourceInputs */
/**
* | output |
* | --- |
* | "Source: {source}" |
*
* @param {Credit_SourceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_source: ((inputs: Credit_SourceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_SourceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_SourceInputs = {
    source: NonNullable<unknown>;
};
