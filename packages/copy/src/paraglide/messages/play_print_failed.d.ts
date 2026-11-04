/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Print_FailedInputs */
/**
* | output |
* | --- |
* | "The sheet didn't come out. Try again." |
*
* @param {Play_Print_FailedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_failed: ((inputs?: Play_Print_FailedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Print_FailedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Print_FailedInputs = {};
