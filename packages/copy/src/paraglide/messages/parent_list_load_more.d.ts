/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Load_MoreInputs */
/**
* | output |
* | --- |
* | "Show more" |
*
* @param {Parent_List_Load_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_load_more: ((inputs?: Parent_List_Load_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Load_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Load_MoreInputs = {};
