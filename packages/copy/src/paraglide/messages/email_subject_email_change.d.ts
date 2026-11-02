/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Subject_Email_ChangeInputs */
/**
* | output |
* | --- |
* | "Your code to change your Jadwigo email" |
*
* @param {Email_Subject_Email_ChangeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_email_change: ((inputs?: Email_Subject_Email_ChangeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Subject_Email_ChangeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Subject_Email_ChangeInputs = {};
