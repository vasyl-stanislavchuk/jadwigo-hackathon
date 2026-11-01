/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_PausedInputs */
/**
* | output |
* | --- |
* | "The lesson is waiting for you." |
*
* @param {Play_PausedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_paused: ((inputs?: Play_PausedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_PausedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_PausedInputs = {};
