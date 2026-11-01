/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ source: NonNullable<unknown> }} Credit_LabelInputs */
/**
* | output |
* | --- |
* | "From {source}. See the source and license." |
*
* @param {Credit_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const credit_label: ((inputs: Credit_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Credit_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Credit_LabelInputs = {
    source: NonNullable<unknown>;
};
