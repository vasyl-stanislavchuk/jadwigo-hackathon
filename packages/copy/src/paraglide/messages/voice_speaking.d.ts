/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Voice_SpeakingInputs */
/**
* | output |
* | --- |
* | "The voice is speaking…" |
*
* @param {Voice_SpeakingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const voice_speaking: ((inputs?: Voice_SpeakingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Voice_SpeakingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Voice_SpeakingInputs = {};
