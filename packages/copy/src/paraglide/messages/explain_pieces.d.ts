/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Explain_PiecesInputs */
/**
* | output |
* | --- |
* | "The pieces of your explanation" |
*
* @param {Explain_PiecesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const explain_pieces: ((inputs?: Explain_PiecesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Explain_PiecesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Explain_PiecesInputs = {};
