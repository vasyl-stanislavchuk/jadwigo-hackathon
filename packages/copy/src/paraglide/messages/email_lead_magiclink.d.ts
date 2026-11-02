/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_Lead_MagiclinkInputs */
/**
* | output |
* | --- |
* | "This is your Jadwigo code. Enter it on the sign-in page." |
*
* @param {Email_Lead_MagiclinkInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_lead_magiclink: ((inputs?: Email_Lead_MagiclinkInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_Lead_MagiclinkInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_Lead_MagiclinkInputs = {};
