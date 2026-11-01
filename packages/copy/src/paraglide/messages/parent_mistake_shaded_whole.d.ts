/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Shaded_WholeInputs */
/**
* | output |
* | --- |
* | "The whole shape shaded" |
*
* @param {Parent_Mistake_Shaded_WholeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_shaded_whole: ((inputs?: Parent_Mistake_Shaded_WholeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Shaded_WholeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Shaded_WholeInputs = {};
