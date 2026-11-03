/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ title: NonNullable<unknown> }} Parent_List_Select_RowInputs */
/**
* | output |
* | --- |
* | "Select: {title}" |
*
* @param {Parent_List_Select_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_select_row: ((inputs: Parent_List_Select_RowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Select_RowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Select_RowInputs = {
    title: NonNullable<unknown>;
};
