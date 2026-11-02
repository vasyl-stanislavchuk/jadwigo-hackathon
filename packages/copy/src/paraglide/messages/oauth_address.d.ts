/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ host: NonNullable<unknown> }} Oauth_AddressInputs */
/**
* | output |
* | --- |
* | "The app's address: {host}" |
*
* @param {Oauth_AddressInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_address: ((inputs: Oauth_AddressInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_AddressInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_AddressInputs = {
    host: NonNullable<unknown>;
};
