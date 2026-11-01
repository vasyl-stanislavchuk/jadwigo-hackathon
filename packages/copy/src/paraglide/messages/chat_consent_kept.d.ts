/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Consent_KeptInputs */
/**
* | output |
* | --- |
* | "The record of your conversations stays with your family's account until the account is deleted. An archived conversation does too." |
*
* @param {Chat_Consent_KeptInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_kept: ((inputs?: Chat_Consent_KeptInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Consent_KeptInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Consent_KeptInputs = {};
