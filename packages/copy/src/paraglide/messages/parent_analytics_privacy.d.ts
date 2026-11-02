/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Analytics_PrivacyInputs */
/**
* | output |
* | --- |
* | "Privacy" |
*
* @param {Parent_Analytics_PrivacyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_analytics_privacy: ((inputs?: Parent_Analytics_PrivacyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Analytics_PrivacyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Analytics_PrivacyInputs = {};
