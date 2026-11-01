/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ a: NonNullable<unknown>, b: NonNullable<unknown> }} Groups_LabelInputs */
/**
* | groups_noun | output |
* | --- | --- |
* | "one" | "{a} group of {b}" |
* | "other" | "{a} groups of {b}" |
*
* @param {Groups_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const groups_label: ((inputs: Groups_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Groups_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Groups_LabelInputs = {
    a: NonNullable<unknown>;
    b: NonNullable<unknown>;
};
