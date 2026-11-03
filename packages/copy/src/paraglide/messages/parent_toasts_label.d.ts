/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Toasts_LabelInputs */
/**
* | output |
* | --- |
* | "Notifications" |
*
* @param {Parent_Toasts_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_toasts_label: ((inputs?: Parent_Toasts_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Toasts_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Toasts_LabelInputs = {};
