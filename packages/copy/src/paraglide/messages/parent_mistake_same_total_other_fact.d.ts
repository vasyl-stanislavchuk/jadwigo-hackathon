/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Same_Total_Other_FactInputs */
/**
* | output |
* | --- |
* | "The same result from another fact" |
*
* @param {Parent_Mistake_Same_Total_Other_FactInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_same_total_other_fact: ((inputs?: Parent_Mistake_Same_Total_Other_FactInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Same_Total_Other_FactInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Same_Total_Other_FactInputs = {};
