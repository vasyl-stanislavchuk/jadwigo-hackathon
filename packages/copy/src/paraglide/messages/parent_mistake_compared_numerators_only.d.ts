/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Compared_Numerators_OnlyInputs */
/**
* | output |
* | --- |
* | "Only the numerators compared" |
*
* @param {Parent_Mistake_Compared_Numerators_OnlyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_compared_numerators_only: ((inputs?: Parent_Mistake_Compared_Numerators_OnlyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Compared_Numerators_OnlyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Compared_Numerators_OnlyInputs = {};
