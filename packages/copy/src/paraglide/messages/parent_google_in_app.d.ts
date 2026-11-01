/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Google_In_AppInputs */
/**
* | output |
* | --- |
* | "Google can't sign you in inside this app. To continue with Google, open this page in your phone's browser." |
*
* @param {Parent_Google_In_AppInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_google_in_app: ((inputs?: Parent_Google_In_AppInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Google_In_AppInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Google_In_AppInputs = {};
