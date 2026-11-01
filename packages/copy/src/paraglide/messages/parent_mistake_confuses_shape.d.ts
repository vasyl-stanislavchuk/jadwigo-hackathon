/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Confuses_ShapeInputs */
/**
* | output |
* | --- |
* | "One shape taken for another" |
*
* @param {Parent_Mistake_Confuses_ShapeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_shape: ((inputs?: Parent_Mistake_Confuses_ShapeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Confuses_ShapeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Confuses_ShapeInputs = {};
