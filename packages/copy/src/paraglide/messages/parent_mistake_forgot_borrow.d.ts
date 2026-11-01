/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Forgot_BorrowInputs */
/**
* | output |
* | --- |
* | "The borrow left out" |
*
* @param {Parent_Mistake_Forgot_BorrowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_forgot_borrow: ((inputs?: Parent_Mistake_Forgot_BorrowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Forgot_BorrowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Forgot_BorrowInputs = {};
