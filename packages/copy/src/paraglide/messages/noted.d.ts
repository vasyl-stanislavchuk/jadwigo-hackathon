/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} NotedInputs */
/**
* | output |
* | --- |
* | "Thank you! On we go." |
*
* @param {NotedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const noted: ((inputs?: NotedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<NotedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type NotedInputs = {};
