/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Mistake_Borrow_Not_MarkedInputs */
/**
* | output |
* | --- |
* | "The borrow not written down" |
*
* @param {Parent_Mistake_Borrow_Not_MarkedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_mistake_borrow_not_marked: ((inputs?: Parent_Mistake_Borrow_Not_MarkedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Mistake_Borrow_Not_MarkedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Mistake_Borrow_Not_MarkedInputs = {};
