/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Kind_DocxInputs */
/**
* | output |
* | --- |
* | "DOCX" |
*
* @param {Attach_Kind_DocxInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_kind_docx: ((inputs?: Attach_Kind_DocxInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Kind_DocxInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Kind_DocxInputs = {};
