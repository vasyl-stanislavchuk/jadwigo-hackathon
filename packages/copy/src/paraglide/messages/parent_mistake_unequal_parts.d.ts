/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Unequal_PartsInputs */
/**
* | output |
* | --- |
* | "Unequal parts" |
*
* @param {Parent_Mistake_Unequal_PartsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_unequal_parts: ((inputs?: Parent_Mistake_Unequal_PartsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Unequal_PartsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Unequal_PartsInputs = {};
