/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Unit_MixedInputs */
/**
* | output |
* | --- |
* | "The units mixed up" |
*
* @param {Parent_Mistake_Unit_MixedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_unit_mixed: ((inputs?: Parent_Mistake_Unit_MixedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Unit_MixedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Unit_MixedInputs = {};
