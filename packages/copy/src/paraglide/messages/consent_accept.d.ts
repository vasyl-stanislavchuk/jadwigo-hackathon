/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Consent_AcceptInputs */
/**
* | output |
* | --- |
* | "Accept" |
*
* @param {Consent_AcceptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_accept: ((inputs?: Consent_AcceptInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Consent_AcceptInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Consent_AcceptInputs = {};
