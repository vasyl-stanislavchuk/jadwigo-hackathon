/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Subject_ReauthenticationInputs */
/**
* | output |
* | --- |
* | "Your Jadwigo confirmation code" |
*
* @param {Email_Subject_ReauthenticationInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_reauthentication: ((inputs?: Email_Subject_ReauthenticationInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Subject_ReauthenticationInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Subject_ReauthenticationInputs = {};
