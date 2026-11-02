/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ email: NonNullable<unknown> }} Oauth_AsInputs */
/**
* | output |
* | --- |
* | "Signed in as {email}." |
*
* @param {Oauth_AsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_as: ((inputs: Oauth_AsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_AsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_AsInputs = {
    email: NonNullable<unknown>;
};
