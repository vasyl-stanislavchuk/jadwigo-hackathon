/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Voice_WakingInputs */
/**
* | output |
* | --- |
* | "The voice is waking up…" |
*
* @param {Voice_WakingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const voice_waking: ((inputs?: Voice_WakingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Voice_WakingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Voice_WakingInputs = {};
