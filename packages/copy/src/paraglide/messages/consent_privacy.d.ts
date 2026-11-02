/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Consent_PrivacyInputs */
/**
* | output |
* | --- |
* | "Privacy" |
*
* @param {Consent_PrivacyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_privacy: ((inputs?: Consent_PrivacyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Consent_PrivacyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Consent_PrivacyInputs = {};
