/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Leave_StayInputs */
/**
* | output |
* | --- |
* | "Stay" |
*
* @param {Leave_StayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const leave_stay: ((inputs?: Leave_StayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Leave_StayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Leave_StayInputs = {};
