/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_List_SelectedInputs */
/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{n} selected" |
* | "other" | "{n} selected" |
*
* @param {Parent_List_SelectedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_selected: ((inputs: Parent_List_SelectedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_SelectedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_SelectedInputs = {
    n: NonNullable<unknown>;
};
