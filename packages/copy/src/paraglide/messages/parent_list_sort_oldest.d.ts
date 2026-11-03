/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Sort_OldestInputs */
/**
* | output |
* | --- |
* | "Last, oldest first" |
*
* @param {Parent_List_Sort_OldestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_sort_oldest: ((inputs?: Parent_List_Sort_OldestInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Sort_OldestInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Sort_OldestInputs = {};
