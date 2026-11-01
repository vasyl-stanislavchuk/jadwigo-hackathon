/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Report_Skills_StandingInputs */
/**
* | output |
* | --- |
* | "Where the skills stand" |
*
* @param {Parent_Report_Skills_StandingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_skills_standing: ((inputs?: Parent_Report_Skills_StandingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Report_Skills_StandingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Report_Skills_StandingInputs = {};
