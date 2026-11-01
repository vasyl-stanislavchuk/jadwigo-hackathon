/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Overview_LegendInputs */
/**
* | output |
* | --- |
* | "Key" |
*
* @param {Parent_Overview_LegendInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_legend: ((inputs?: Parent_Overview_LegendInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_LegendInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_LegendInputs = {};
