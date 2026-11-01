/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Crumb_OverviewInputs */
/**
* | output |
* | --- |
* | "Lesson overview" |
*
* @param {Parent_Crumb_OverviewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_crumb_overview: ((inputs?: Parent_Crumb_OverviewInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Crumb_OverviewInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Crumb_OverviewInputs = {};
