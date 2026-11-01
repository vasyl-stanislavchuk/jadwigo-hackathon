/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Report_Next_FocusInputs */
/**
* | output |
* | --- |
* | "What to focus on next" |
*
* @param {Parent_Report_Next_FocusInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_next_focus: ((inputs?: Parent_Report_Next_FocusInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Report_Next_FocusInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Report_Next_FocusInputs = {};
