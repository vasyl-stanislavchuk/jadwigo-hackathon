/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Split_Not_HelpfulInputs */
/**
* | output |
* | --- |
* | "A split that does not make it easier" |
*
* @param {Parent_Mistake_Split_Not_HelpfulInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_split_not_helpful: ((inputs?: Parent_Mistake_Split_Not_HelpfulInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Split_Not_HelpfulInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Split_Not_HelpfulInputs = {};
