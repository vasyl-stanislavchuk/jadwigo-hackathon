/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Consent_TitleInputs */
/**
* | output |
* | --- |
* | "Cookies" |
*
* @param {Consent_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_title: ((inputs?: Consent_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Consent_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Consent_TitleInputs = {};
