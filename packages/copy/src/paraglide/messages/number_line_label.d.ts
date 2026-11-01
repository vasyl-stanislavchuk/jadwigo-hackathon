/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ b: NonNullable<unknown>, a: NonNullable<unknown> }} Number_Line_LabelInputs */
/**
* | jumps_noun | output |
* | --- | --- |
* | "one" | "{b} jump of {a}" |
* | "other" | "{b} jumps of {a}" |
*
* @param {Number_Line_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const number_line_label: ((inputs: Number_Line_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Number_Line_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Number_Line_LabelInputs = {
    b: NonNullable<unknown>;
    a: NonNullable<unknown>;
};
