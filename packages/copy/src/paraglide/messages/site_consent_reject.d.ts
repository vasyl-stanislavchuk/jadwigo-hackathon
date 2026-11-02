/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Consent_RejectInputs */
/**
* | output |
* | --- |
* | "No, thanks" |
*
* @param {Site_Consent_RejectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_consent_reject: ((inputs?: Site_Consent_RejectInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Consent_RejectInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Consent_RejectInputs = {};
