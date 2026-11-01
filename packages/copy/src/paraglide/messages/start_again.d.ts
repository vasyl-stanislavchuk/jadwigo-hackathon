/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Start_AgainInputs */
/**
* | output |
* | --- |
* | "Start again" |
*
* @param {Start_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const start_again: ((inputs?: Start_AgainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Start_AgainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Start_AgainInputs = {};
