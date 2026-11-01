/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Attach_Kind_PdfInputs */
/**
* | output |
* | --- |
* | "PDF" |
*
* @param {Attach_Kind_PdfInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_kind_pdf: ((inputs?: Attach_Kind_PdfInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Kind_PdfInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Kind_PdfInputs = {};
