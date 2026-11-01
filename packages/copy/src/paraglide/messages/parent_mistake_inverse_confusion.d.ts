/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Inverse_ConfusionInputs */
/**
* | output |
* | --- |
* | "The opposite operation to the one needed" |
*
* @param {Parent_Mistake_Inverse_ConfusionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_inverse_confusion: ((inputs?: Parent_Mistake_Inverse_ConfusionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Inverse_ConfusionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Inverse_ConfusionInputs = {};
