/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_Do_TickInputs */
/**
* | output |
* | --- |
* | "Tick ✓ every right answer." |
*
* @param {Print_Do_TickInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_do_tick: ((inputs?: Print_Do_TickInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_Do_TickInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_Do_TickInputs = {};
