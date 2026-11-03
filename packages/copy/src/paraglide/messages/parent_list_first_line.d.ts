/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_First_LineInputs */
/**
* | output |
* | --- |
* | "Write what your child is learning, or add a photo of the homework." |
*
* @param {Parent_List_First_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_first_line: ((inputs?: Parent_List_First_LineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_First_LineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_First_LineInputs = {};
