/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Print_DateInputs */
/**
* | output |
* | --- |
* | "Date:" |
*
* @param {Print_DateInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const print_date: ((inputs?: Print_DateInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Print_DateInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Print_DateInputs = {};
