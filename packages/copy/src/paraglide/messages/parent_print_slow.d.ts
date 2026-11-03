/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Print_SlowInputs */
/**
* | output |
* | --- |
* | "The sheet is still being prepared. Try again in a moment." |
*
* @param {Parent_Print_SlowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_print_slow: ((inputs?: Parent_Print_SlowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Print_SlowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Print_SlowInputs = {};
