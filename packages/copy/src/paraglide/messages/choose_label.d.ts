/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Choose_LabelInputs */
/**
* | output |
* | --- |
* | "Jadwigo asks" |
*
* @param {Choose_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const choose_label: ((inputs?: Choose_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Choose_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Choose_LabelInputs = {};
