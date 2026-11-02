/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Consent_AcceptInputs */
/**
* | output |
* | --- |
* | "I agree" |
*
* @param {Site_Consent_AcceptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_consent_accept: ((inputs?: Site_Consent_AcceptInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Consent_AcceptInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Consent_AcceptInputs = {};
