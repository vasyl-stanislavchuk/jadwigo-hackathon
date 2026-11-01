/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Menu_UnfoldInputs */
/**
* | output |
* | --- |
* | "Unfold the menu" |
*
* @param {Parent_Menu_UnfoldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_menu_unfold: ((inputs?: Parent_Menu_UnfoldInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Menu_UnfoldInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Menu_UnfoldInputs = {};
