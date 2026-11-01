/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Confuses_QuotientInputs */
/**
* | output |
* | --- |
* | "The quotient mixed up with another result" |
*
* @param {Parent_Mistake_Confuses_QuotientInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_confuses_quotient: ((inputs?: Parent_Mistake_Confuses_QuotientInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Confuses_QuotientInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Confuses_QuotientInputs = {};
