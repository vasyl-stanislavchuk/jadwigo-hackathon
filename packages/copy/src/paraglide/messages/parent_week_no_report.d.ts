/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Week_No_ReportInputs */
/**
* | output |
* | --- |
* | "No report this week" |
*
* @param {Parent_Week_No_ReportInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_week_no_report: ((inputs?: Parent_Week_No_ReportInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Week_No_ReportInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Week_No_ReportInputs = {};
