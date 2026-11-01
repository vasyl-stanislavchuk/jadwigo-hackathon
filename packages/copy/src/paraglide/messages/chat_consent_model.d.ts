/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Consent_ModelInputs */
/**
* | output |
* | --- |
* | "That data goes to Meta's models, which may learn from it." |
*
* @param {Chat_Consent_ModelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent_model: ((inputs?: Chat_Consent_ModelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Consent_ModelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Consent_ModelInputs = {};
