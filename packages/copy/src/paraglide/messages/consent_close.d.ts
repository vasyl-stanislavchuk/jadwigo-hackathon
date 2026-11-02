/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Consent_CloseInputs */
/**
* | output |
* | --- |
* | "Close" |
*
* @param {Consent_CloseInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const consent_close: ((inputs?: Consent_CloseInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Consent_CloseInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Consent_CloseInputs = {};
