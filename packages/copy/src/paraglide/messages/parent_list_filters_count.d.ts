/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_List_Filters_CountInputs */
/**
* | output |
* | --- |
* | "Filters ({n})" |
*
* @param {Parent_List_Filters_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_filters_count: ((inputs: Parent_List_Filters_CountInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Filters_CountInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Filters_CountInputs = {
    n: NonNullable<unknown>;
};
