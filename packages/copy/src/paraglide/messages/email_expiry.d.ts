/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_ExpiryInputs */
/**
* | output |
* | --- |
* | "It works for a short time and only once." |
*
* @param {Email_ExpiryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_expiry: ((inputs?: Email_ExpiryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_ExpiryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_ExpiryInputs = {};
