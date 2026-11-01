/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Add_Child_MenuInputs */
/**
* | output |
* | --- |
* | "Add a child…" |
*
* @param {Parent_Add_Child_MenuInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_add_child_menu: ((inputs?: Parent_Add_Child_MenuInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Add_Child_MenuInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Add_Child_MenuInputs = {};
