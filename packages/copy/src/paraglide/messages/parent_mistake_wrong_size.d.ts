/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Wrong_SizeInputs */
/**
* | output |
* | --- |
* | "A shape of another size" |
*
* @param {Parent_Mistake_Wrong_SizeInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_wrong_size: ((inputs?: Parent_Mistake_Wrong_SizeInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Wrong_SizeInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Wrong_SizeInputs = {};
