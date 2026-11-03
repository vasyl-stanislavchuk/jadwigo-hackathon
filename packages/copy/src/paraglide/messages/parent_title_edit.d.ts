/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ title: NonNullable<unknown> }} Parent_Title_EditInputs */
/**
* | output |
* | --- |
* | "Change the title: {title}" |
*
* @param {Parent_Title_EditInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_title_edit: ((inputs: Parent_Title_EditInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Title_EditInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Title_EditInputs = {
    title: NonNullable<unknown>;
};
