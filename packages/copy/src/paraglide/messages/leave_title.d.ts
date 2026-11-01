/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Leave_TitleInputs */
/**
* | output |
* | --- |
* | "This link leaves Jadwigo" |
*
* @param {Leave_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const leave_title: ((inputs?: Leave_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Leave_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Leave_TitleInputs = {};
