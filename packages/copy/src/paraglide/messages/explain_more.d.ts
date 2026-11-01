/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Explain_MoreInputs */
/**
* | output |
* | --- |
* | "Write a little more. Then press Check." |
*
* @param {Explain_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const explain_more: ((inputs?: Explain_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Explain_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Explain_MoreInputs = {};
