/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Report_Not_WrittenInputs */
/**
* | output |
* | --- |
* | "The report's numbers are in, but it is not written up yet." |
*
* @param {Parent_Report_Not_WrittenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_not_written: ((inputs?: Parent_Report_Not_WrittenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Report_Not_WrittenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Report_Not_WrittenInputs = {};
