/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ label: NonNullable<unknown> }} Bar_LabelInputs */
/**
* | output |
* | --- |
* | "Bar: {label}" |
*
* @param {Bar_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const bar_label: ((inputs: Bar_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Bar_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Bar_LabelInputs = {
    label: NonNullable<unknown>;
};
