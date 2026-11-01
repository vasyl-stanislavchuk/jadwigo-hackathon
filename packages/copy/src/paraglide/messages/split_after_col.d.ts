/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Split_After_ColInputs */
/**
* | output |
* | --- |
* | "Split after column {n}" |
*
* @param {Split_After_ColInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const split_after_col: ((inputs: Split_After_ColInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Split_After_ColInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Split_After_ColInputs = {
    n: NonNullable<unknown>;
};
