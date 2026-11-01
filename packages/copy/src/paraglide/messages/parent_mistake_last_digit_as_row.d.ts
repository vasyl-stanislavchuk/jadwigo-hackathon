/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Last_Digit_As_RowInputs */
/**
* | output |
* | --- |
* | "The last digit taken for the times-table row" |
*
* @param {Parent_Mistake_Last_Digit_As_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_last_digit_as_row: ((inputs?: Parent_Mistake_Last_Digit_As_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Last_Digit_As_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Last_Digit_As_RowInputs = {};
