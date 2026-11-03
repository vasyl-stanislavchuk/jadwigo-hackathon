/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_List_ShowInputs */
/**
* | n_noun | output |
* | --- | --- |
* | "one" | "Show {n} lesson" |
* | "other" | "Show {n} lessons" |
*
* @param {Parent_List_ShowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_show: ((inputs: Parent_List_ShowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_ShowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_ShowInputs = {
    n: NonNullable<unknown>;
};
