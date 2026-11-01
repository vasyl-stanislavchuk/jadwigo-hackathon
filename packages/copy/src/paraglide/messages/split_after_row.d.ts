/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Split_After_RowInputs */
/**
* | output |
* | --- |
* | "Split after row {n}" |
*
* @param {Split_After_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const split_after_row: ((inputs: Split_After_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Split_After_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Split_After_RowInputs = {
    n: NonNullable<unknown>;
};
