/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Account_Signed_InInputs */
/**
* | output |
* | --- |
* | "You're signed in on this device. Sign out when it isn't yours." |
*
* @param {Parent_Account_Signed_InInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_account_signed_in: ((inputs?: Parent_Account_Signed_InInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Account_Signed_InInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Account_Signed_InInputs = {};
