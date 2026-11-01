/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Footer_DataInputs */
/**
* | output |
* | --- |
* | "Only you see your child's answers. You can ask us to delete them at any time." |
*
* @param {Site_Footer_DataInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_data: ((inputs?: Site_Footer_DataInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Footer_DataInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Footer_DataInputs = {};
