/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Footer_DeletionInputs */
/**
* | output |
* | --- |
* | "Data deletion" |
*
* @param {Site_Footer_DeletionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_deletion: ((inputs?: Site_Footer_DeletionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Footer_DeletionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Footer_DeletionInputs = {};
