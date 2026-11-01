/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Continue_GoogleInputs */
/**
* | output |
* | --- |
* | "Continue with Google" |
*
* @param {Parent_Continue_GoogleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_continue_google: ((inputs?: Parent_Continue_GoogleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Continue_GoogleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Continue_GoogleInputs = {};
