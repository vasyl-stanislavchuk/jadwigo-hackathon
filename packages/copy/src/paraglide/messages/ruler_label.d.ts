/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ruler_LabelInputs */
/**
* | output |
* | --- |
* | "Ruler. Drag it, or move it with the arrow keys." |
*
* @param {Ruler_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ruler_label: ((inputs?: Ruler_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ruler_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ruler_LabelInputs = {};
