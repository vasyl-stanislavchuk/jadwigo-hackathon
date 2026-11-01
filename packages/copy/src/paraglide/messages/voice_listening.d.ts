/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Voice_ListeningInputs */
/**
* | output |
* | --- |
* | "The voice is listening." |
*
* @param {Voice_ListeningInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const voice_listening: ((inputs?: Voice_ListeningInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Voice_ListeningInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Voice_ListeningInputs = {};
