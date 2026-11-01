/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Borrow_ErrorInputs */
/**
* | output |
* | --- |
* | "Borrowed in another column" |
*
* @param {Parent_Mistake_Borrow_ErrorInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_borrow_error: ((inputs?: Parent_Mistake_Borrow_ErrorInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Borrow_ErrorInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Borrow_ErrorInputs = {};
