/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Lead_RecoveryInputs */
/**
* | output |
* | --- |
* | "This is your code to get back into your Jadwigo account. Enter it on the sign-in page." |
*
* @param {Email_Lead_RecoveryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_recovery: ((inputs?: Email_Lead_RecoveryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Lead_RecoveryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Lead_RecoveryInputs = {};
