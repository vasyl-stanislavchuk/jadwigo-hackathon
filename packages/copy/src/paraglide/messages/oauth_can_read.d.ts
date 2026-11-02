/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Oauth_Can_ReadInputs */
/**
* | output |
* | --- |
* | "read your family's data and the question bank" |
*
* @param {Oauth_Can_ReadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_can_read: ((inputs?: Oauth_Can_ReadInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_Can_ReadInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_Can_ReadInputs = {};
