/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_List_ChosenInputs */
/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{n} chosen" |
* | "other" | "{n} chosen" |
*
* @param {Parent_List_ChosenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_chosen: ((inputs: Parent_List_ChosenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_ChosenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_ChosenInputs = {
    n: NonNullable<unknown>;
};
