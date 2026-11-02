/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Lead_ReauthenticationInputs */
/**
* | output |
* | --- |
* | "This is your code to confirm it's you. Enter it in Jadwigo." |
*
* @param {Email_Lead_ReauthenticationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_reauthentication: ((inputs?: Email_Lead_ReauthenticationInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Lead_ReauthenticationInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Lead_ReauthenticationInputs = {};
