/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Scale_MisreadInputs */
/**
* | output |
* | --- |
* | "The scale's steps read differently" |
*
* @param {Parent_Mistake_Scale_MisreadInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_scale_misread: ((inputs?: Parent_Mistake_Scale_MisreadInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Scale_MisreadInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Scale_MisreadInputs = {};
