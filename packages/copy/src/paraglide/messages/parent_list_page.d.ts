/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ page: NonNullable<unknown>, pages: NonNullable<unknown> }} Parent_List_PageInputs */
/**
* | output |
* | --- |
* | "Page {page} of {pages}" |
*
* @param {Parent_List_PageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_page: ((inputs: Parent_List_PageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_PageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_PageInputs = {
    page: NonNullable<unknown>;
    pages: NonNullable<unknown>;
};
