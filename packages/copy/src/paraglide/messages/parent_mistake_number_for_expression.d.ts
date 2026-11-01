/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Number_For_ExpressionInputs */
/**
* | output |
* | --- |
* | "Just the result, not the expression" |
*
* @param {Parent_Mistake_Number_For_ExpressionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_number_for_expression: ((inputs?: Parent_Mistake_Number_For_ExpressionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Number_For_ExpressionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Number_For_ExpressionInputs = {};
