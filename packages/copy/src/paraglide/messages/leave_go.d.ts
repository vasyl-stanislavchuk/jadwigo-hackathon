/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Leave_GoInputs */
/**
* | output |
* | --- |
* | "Open it" |
*
* @param {Leave_GoInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const leave_go: ((inputs?: Leave_GoInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Leave_GoInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Leave_GoInputs = {};
