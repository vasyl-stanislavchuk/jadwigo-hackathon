/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Pyramid_LabelInputs */
/**
* | output |
* | --- |
* | "Number pyramid" |
*
* @param {Pyramid_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const pyramid_label: ((inputs?: Pyramid_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Pyramid_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Pyramid_LabelInputs = {};
