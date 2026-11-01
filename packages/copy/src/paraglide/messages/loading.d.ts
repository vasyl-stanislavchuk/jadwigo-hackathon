/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} LoadingInputs */
/**
* | output |
* | --- |
* | "Just a moment…" |
*
* @param {LoadingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const loading: ((inputs?: LoadingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<LoadingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type LoadingInputs = {};
