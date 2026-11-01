/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Consent_ReadsInputs */
/**
* | output |
* | --- |
* | "The assistant reads what your request needs: your child's data, names included." |
*
* @param {Chat_Consent_ReadsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_reads: ((inputs?: Chat_Consent_ReadsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Consent_ReadsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Consent_ReadsInputs = {};
