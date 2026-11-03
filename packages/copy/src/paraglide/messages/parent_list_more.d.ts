/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ title: NonNullable<unknown> }} Parent_List_MoreInputs */
/**
* | output |
* | --- |
* | "More: {title}" |
*
* @param {Parent_List_MoreInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_more: ((inputs: Parent_List_MoreInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_MoreInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_MoreInputs = {
    title: NonNullable<unknown>;
};
