/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Nav_Sign_InInputs */
/**
* | output |
* | --- |
* | "Sign in" |
*
* @param {Site_Nav_Sign_InInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_nav_sign_in: ((inputs?: Site_Nav_Sign_InInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Nav_Sign_InInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Nav_Sign_InInputs = {};
