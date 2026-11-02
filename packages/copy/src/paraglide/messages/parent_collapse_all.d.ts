/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Collapse_AllInputs */
/**
* | output |
* | --- |
* | "Collapse all" |
*
* @param {Parent_Collapse_AllInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_collapse_all: ((inputs?: Parent_Collapse_AllInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Collapse_AllInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Collapse_AllInputs = {};
