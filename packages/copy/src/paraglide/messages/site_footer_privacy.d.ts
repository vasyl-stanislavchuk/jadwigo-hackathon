/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Footer_PrivacyInputs */
/**
* | output |
* | --- |
* | "Privacy" |
*
* @param {Site_Footer_PrivacyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_footer_privacy: ((inputs?: Site_Footer_PrivacyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Footer_PrivacyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Footer_PrivacyInputs = {};
