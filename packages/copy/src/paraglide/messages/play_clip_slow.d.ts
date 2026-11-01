/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Clip_SlowInputs */
/**
* | output |
* | --- |
* | "Listen slowly" |
*
* @param {Play_Clip_SlowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_clip_slow: ((inputs?: Play_Clip_SlowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Clip_SlowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Clip_SlowInputs = {};
