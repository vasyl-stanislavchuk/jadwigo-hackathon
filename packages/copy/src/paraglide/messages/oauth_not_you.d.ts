/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Oauth_Not_YouInputs */
/**
* | output |
* | --- |
* | "Not you? Sign out" |
*
* @param {Oauth_Not_YouInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_not_you: ((inputs?: Oauth_Not_YouInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_Not_YouInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_Not_YouInputs = {};
