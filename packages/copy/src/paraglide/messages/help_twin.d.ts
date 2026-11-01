/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Help_TwinInputs */
/**
* | output |
* | --- |
* | "Now one like it. Your turn!" |
*
* @param {Help_TwinInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const help_twin: ((inputs?: Help_TwinInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Help_TwinInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Help_TwinInputs = {};
