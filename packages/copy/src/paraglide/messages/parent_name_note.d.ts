/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Name_NoteInputs */
/**
* | output |
* | --- |
* | "Only you and Jadwigo in the chat see it. It never goes into a lesson." |
*
* @param {Parent_Name_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_name_note: ((inputs?: Parent_Name_NoteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Name_NoteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Name_NoteInputs = {};
