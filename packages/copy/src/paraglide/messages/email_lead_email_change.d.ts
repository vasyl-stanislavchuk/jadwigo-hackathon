/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Lead_Email_ChangeInputs */
/**
* | output |
* | --- |
* | "This is your code to change the email address of your Jadwigo account. Enter it where you are changing it." |
*
* @param {Email_Lead_Email_ChangeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_email_change: ((inputs?: Email_Lead_Email_ChangeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Lead_Email_ChangeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Lead_Email_ChangeInputs = {};
