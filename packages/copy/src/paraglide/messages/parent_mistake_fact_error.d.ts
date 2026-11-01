/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Fact_ErrorInputs */
/**
* | output |
* | --- |
* | "A slip in a basic fact" |
*
* @param {Parent_Mistake_Fact_ErrorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_fact_error: ((inputs?: Parent_Mistake_Fact_ErrorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Fact_ErrorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Fact_ErrorInputs = {};
