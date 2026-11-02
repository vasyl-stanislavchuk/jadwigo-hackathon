/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Oauth_CanInputs */
/**
* | output |
* | --- |
* | "This app will be able to:" |
*
* @param {Oauth_CanInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_can: ((inputs?: Oauth_CanInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_CanInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_CanInputs = {};
