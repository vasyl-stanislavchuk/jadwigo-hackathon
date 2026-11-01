/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Continue_FacebookInputs */
/**
* | output |
* | --- |
* | "Continue with Facebook" |
*
* @param {Parent_Continue_FacebookInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_continue_facebook: ((inputs?: Parent_Continue_FacebookInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Continue_FacebookInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Continue_FacebookInputs = {};
