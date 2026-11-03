/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Rating_LabelInputs */
/**
* | output |
* | --- |
* | "This lesson is" |
*
* @param {Rating_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const rating_label: ((inputs?: Rating_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Rating_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Rating_LabelInputs = {};
