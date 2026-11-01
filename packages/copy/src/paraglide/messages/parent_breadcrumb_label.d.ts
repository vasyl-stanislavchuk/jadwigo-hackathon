/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Breadcrumb_LabelInputs */
/**
* | output |
* | --- |
* | "Where you are" |
*
* @param {Parent_Breadcrumb_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_breadcrumb_label: ((inputs?: Parent_Breadcrumb_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Breadcrumb_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Breadcrumb_LabelInputs = {};
