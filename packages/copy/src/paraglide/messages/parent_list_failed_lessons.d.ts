/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Failed_LessonsInputs */
/**
* | output |
* | --- |
* | "Couldn't load the lessons" |
*
* @param {Parent_List_Failed_LessonsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_failed_lessons: ((inputs?: Parent_List_Failed_LessonsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Failed_LessonsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Failed_LessonsInputs = {};
