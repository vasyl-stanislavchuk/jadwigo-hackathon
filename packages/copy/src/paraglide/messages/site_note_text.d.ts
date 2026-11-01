/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Site_Note_TextInputs */
/**
* | output |
* | --- |
* | "This page is also in English." |
*
* @param {Site_Note_TextInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const site_note_text: ((inputs?: Site_Note_TextInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Site_Note_TextInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Site_Note_TextInputs = {};
