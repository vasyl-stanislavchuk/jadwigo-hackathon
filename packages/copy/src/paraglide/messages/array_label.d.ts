/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ a: NonNullable<unknown>, b: NonNullable<unknown> }} Array_LabelInputs */
/**
* | rows_noun | dots_noun | output |
* | --- | --- | --- |
* | "one" | "one" | "{a} row of {b} dot" |
* | "one" | "other" | "{a} row of {b} dots" |
* | "other" | "one" | "{a} rows of {b} dot" |
* | "other" | "other" | "{a} rows of {b} dots" |
*
* @param {Array_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const array_label: ((inputs: Array_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Array_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Array_LabelInputs = {
    a: NonNullable<unknown>;
    b: NonNullable<unknown>;
};
