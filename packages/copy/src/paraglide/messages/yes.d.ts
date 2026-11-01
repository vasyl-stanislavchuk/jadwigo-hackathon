/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} YesInputs */
/**
* | output |
* | --- |
* | "Yes" |
*
* @param {YesInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const yes: ((inputs?: YesInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<YesInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type YesInputs = {};
