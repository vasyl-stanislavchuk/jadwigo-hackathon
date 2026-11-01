/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Provider_FailedInputs */
/**
* | output |
* | --- |
* | "That sign-in didn't finish. Try again, or sign in with a code by email." |
*
* @param {Parent_Provider_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_provider_failed: ((inputs?: Parent_Provider_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Provider_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Provider_FailedInputs = {};
