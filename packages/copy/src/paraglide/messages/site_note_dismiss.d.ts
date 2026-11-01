/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Note_DismissInputs */
/**
* | output |
* | --- |
* | "No, thanks" |
*
* @param {Site_Note_DismissInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_note_dismiss: ((inputs?: Site_Note_DismissInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Note_DismissInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Note_DismissInputs = {};
