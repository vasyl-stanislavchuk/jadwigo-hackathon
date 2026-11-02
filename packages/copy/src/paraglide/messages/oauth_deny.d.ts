/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Oauth_DenyInputs */
/**
* | output |
* | --- |
* | "Deny" |
*
* @param {Oauth_DenyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_deny: ((inputs?: Oauth_DenyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_DenyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_DenyInputs = {};
