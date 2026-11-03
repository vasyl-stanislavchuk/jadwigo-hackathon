/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Sort_When_OldestInputs */
/**
* | output |
* | --- |
* | "When, oldest first" |
*
* @param {Parent_List_Sort_When_OldestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_sort_when_oldest: ((inputs?: Parent_List_Sort_When_OldestInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Sort_When_OldestInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Sort_When_OldestInputs = {};
