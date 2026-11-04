/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Print_PreparingInputs */
/**
* | output |
* | --- |
* | "Getting the sheet ready…" |
*
* @param {Play_Print_PreparingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_print_preparing: ((inputs?: Play_Print_PreparingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Print_PreparingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Print_PreparingInputs = {};
