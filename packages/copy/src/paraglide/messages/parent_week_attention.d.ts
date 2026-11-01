/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Week_AttentionInputs */
/**
* | output |
* | --- |
* | "Need attention: {n}" |
*
* @param {Parent_Week_AttentionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_attention: ((inputs: Parent_Week_AttentionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Week_AttentionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Week_AttentionInputs = {
    n: NonNullable<unknown>;
};
