/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Subject_MagiclinkInputs */
/**
* | output |
* | --- |
* | "Your Jadwigo sign-in code" |
*
* @param {Email_Subject_MagiclinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_subject_magiclink: ((inputs?: Email_Subject_MagiclinkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Subject_MagiclinkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Subject_MagiclinkInputs = {};
