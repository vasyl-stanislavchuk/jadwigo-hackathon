/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Subject_SignupInputs */
/**
* | output |
* | --- |
* | "Your Jadwigo code" |
*
* @param {Email_Subject_SignupInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_signup: ((inputs?: Email_Subject_SignupInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Subject_SignupInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Subject_SignupInputs = {};
