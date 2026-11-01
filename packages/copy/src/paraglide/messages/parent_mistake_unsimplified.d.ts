/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_UnsimplifiedInputs */
/**
* | output |
* | --- |
* | "The right value, not simplified yet" |
*
* @param {Parent_Mistake_UnsimplifiedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_unsimplified: ((inputs?: Parent_Mistake_UnsimplifiedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_UnsimplifiedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_UnsimplifiedInputs = {};
