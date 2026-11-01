/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Provider_No_EmailInputs */
/**
* | output |
* | --- |
* | "This Facebook account has no email address, so it can't sign in here. Sign in with a code by email instead." |
*
* @param {Parent_Provider_No_EmailInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_provider_no_email: ((inputs?: Parent_Provider_No_EmailInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Provider_No_EmailInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Provider_No_EmailInputs = {};
