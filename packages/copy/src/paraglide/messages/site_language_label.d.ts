/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Language_LabelInputs */
/**
* | output |
* | --- |
* | "Language" |
*
* @param {Site_Language_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_language_label: ((inputs?: Site_Language_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Language_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Language_LabelInputs = {};
