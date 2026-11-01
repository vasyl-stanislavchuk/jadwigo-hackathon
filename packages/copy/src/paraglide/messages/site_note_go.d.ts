/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Note_GoInputs */
/**
* | output |
* | --- |
* | "Open in English" |
*
* @param {Site_Note_GoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_note_go: ((inputs?: Site_Note_GoInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Note_GoInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Note_GoInputs = {};
