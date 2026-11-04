/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Print_SlowInputs */
/**
* | output |
* | --- |
* | "The sheet is still on its way. Try again in a moment." |
*
* @param {Play_Print_SlowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_slow: ((inputs?: Play_Print_SlowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Print_SlowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Print_SlowInputs = {};
