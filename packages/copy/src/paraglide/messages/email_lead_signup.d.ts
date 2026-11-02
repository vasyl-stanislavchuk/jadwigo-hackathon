/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Lead_SignupInputs */
/**
* | output |
* | --- |
* | "This is your Jadwigo code. Enter it on the sign-in page to create your account." |
*
* @param {Email_Lead_SignupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_signup: ((inputs?: Email_Lead_SignupInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Lead_SignupInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Lead_SignupInputs = {};
