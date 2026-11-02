/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Consent_AskInputs */
/**
* | output |
* | --- |
* | "Jadwigo records how the site is used, including screen recordings without what you type, so we can make it better. Do you agree?" |
*
* @param {Site_Consent_AskInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_consent_ask: ((inputs?: Site_Consent_AskInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Consent_AskInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Consent_AskInputs = {};
