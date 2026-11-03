/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_List_Archive_TitleInputs */
/**
* | n_noun | output |
* | --- | --- |
* | "one" | "Archive this lesson?" |
* | "other" | "Archive {n} lessons?" |
*
* @param {Parent_List_Archive_TitleInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_archive_title: ((inputs: Parent_List_Archive_TitleInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Archive_TitleInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Archive_TitleInputs = {
    n: NonNullable<unknown>;
};
