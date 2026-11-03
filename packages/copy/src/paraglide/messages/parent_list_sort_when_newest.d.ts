/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Sort_When_NewestInputs */
/**
* | output |
* | --- |
* | "When, newest first" |
*
* @param {Parent_List_Sort_When_NewestInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_sort_when_newest: ((inputs?: Parent_List_Sort_When_NewestInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Sort_When_NewestInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Sort_When_NewestInputs = {};
