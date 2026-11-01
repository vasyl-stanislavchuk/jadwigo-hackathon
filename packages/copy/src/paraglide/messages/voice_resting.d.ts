/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Voice_RestingInputs */
/**
* | output |
* | --- |
* | "The voice is resting." |
*
* @param {Voice_RestingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const voice_resting: ((inputs?: Voice_RestingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Voice_RestingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Voice_RestingInputs = {};
