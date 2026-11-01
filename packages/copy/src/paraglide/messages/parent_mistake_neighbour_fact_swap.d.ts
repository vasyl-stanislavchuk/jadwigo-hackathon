/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Neighbour_Fact_SwapInputs */
/**
* | output |
* | --- |
* | "The result of a nearby times-table fact" |
*
* @param {Parent_Mistake_Neighbour_Fact_SwapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_neighbour_fact_swap: ((inputs?: Parent_Mistake_Neighbour_Fact_SwapInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Neighbour_Fact_SwapInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Neighbour_Fact_SwapInputs = {};
