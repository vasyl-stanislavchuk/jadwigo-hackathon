/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Clear_FiltersInputs */
/**
* | output |
* | --- |
* | "Clear filters" |
*
* @param {Parent_List_Clear_FiltersInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_clear_filters: ((inputs?: Parent_List_Clear_FiltersInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Clear_FiltersInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Clear_FiltersInputs = {};
