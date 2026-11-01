/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Menu_EmptyInputs */
/**
* | output |
* | --- |
* | "Lessons and history appear here after the first lesson." |
*
* @param {Parent_Menu_EmptyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_menu_empty: ((inputs?: Parent_Menu_EmptyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Menu_EmptyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Menu_EmptyInputs = {};
