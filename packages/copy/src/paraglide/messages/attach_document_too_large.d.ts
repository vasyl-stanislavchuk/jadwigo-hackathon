/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ mb: NonNullable<unknown> }} Attach_Document_Too_LargeInputs */
/**
* | output |
* | --- |
* | "This file is over {mb} MB. Save a smaller copy or add a photo of the page" |
*
* @param {Attach_Document_Too_LargeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_document_too_large: ((inputs: Attach_Document_Too_LargeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Document_Too_LargeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Document_Too_LargeInputs = {
    mb: NonNullable<unknown>;
};
