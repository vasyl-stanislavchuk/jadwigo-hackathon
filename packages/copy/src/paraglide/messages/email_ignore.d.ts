/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Email_IgnoreInputs */
/**
* | output |
* | --- |
* | "If this wasn't you, you can ignore this email." |
*
* @param {Email_IgnoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const email_ignore: ((inputs?: Email_IgnoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Email_IgnoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Email_IgnoreInputs = {};
