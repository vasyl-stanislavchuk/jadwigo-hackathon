/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Source_AuthoredInputs */
/**
* | output |
* | --- |
* | "Written by Jadwigo AI" |
*
* @param {Parent_Source_AuthoredInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_source_authored: ((inputs?: Parent_Source_AuthoredInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Source_AuthoredInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Source_AuthoredInputs = {};
