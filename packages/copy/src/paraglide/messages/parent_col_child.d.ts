/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Col_ChildInputs */
/**
* | output |
* | --- |
* | "Child" |
*
* @param {Parent_Col_ChildInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_col_child: ((inputs?: Parent_Col_ChildInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Col_ChildInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Col_ChildInputs = {};
