/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_UnselectInputs */
/**
* | output |
* | --- |
* | "Clear selection" |
*
* @param {Parent_List_UnselectInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_unselect: ((inputs?: Parent_List_UnselectInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_UnselectInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_UnselectInputs = {};
