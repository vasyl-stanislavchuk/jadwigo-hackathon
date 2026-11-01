/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Miscounted_RowInputs */
/**
* | output |
* | --- |
* | "A row counted differently" |
*
* @param {Parent_Mistake_Miscounted_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_miscounted_row: ((inputs?: Parent_Mistake_Miscounted_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Miscounted_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Miscounted_RowInputs = {};
