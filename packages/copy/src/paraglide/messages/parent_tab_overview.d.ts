/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Tab_OverviewInputs */
/**
* | output |
* | --- |
* | "Overview" |
*
* @param {Parent_Tab_OverviewInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_tab_overview: ((inputs?: Parent_Tab_OverviewInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Tab_OverviewInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Tab_OverviewInputs = {};
