/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Clear_ChoiceInputs */
/**
* | output |
* | --- |
* | "Clear choice" |
*
* @param {Parent_List_Clear_ChoiceInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_clear_choice: ((inputs?: Parent_List_Clear_ChoiceInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Clear_ChoiceInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Clear_ChoiceInputs = {};
