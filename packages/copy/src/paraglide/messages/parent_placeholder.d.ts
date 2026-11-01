/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_PlaceholderInputs */
/**
* | output |
* | --- |
* | "E.g. Subtracting across 10. She found 15 − 7 and 12 − 5 hard." |
*
* @param {Parent_PlaceholderInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_placeholder: ((inputs?: Parent_PlaceholderInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_PlaceholderInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_PlaceholderInputs = {};
