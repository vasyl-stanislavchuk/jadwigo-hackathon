/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Overview_EmptyInputs */
/**
* | output |
* | --- |
* | "Week by week, how learning goes appears here after the first lesson." |
*
* @param {Parent_Overview_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_empty: ((inputs?: Parent_Overview_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_EmptyInputs = {};
