/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Consent_TextInputs */
/**
* | output |
* | --- |
* | "We use a single first-party cookie to make Jadwigo better. Nothing goes to advertisers." |
*
* @param {Consent_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_text: ((inputs?: Consent_TextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Consent_TextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Consent_TextInputs = {};
