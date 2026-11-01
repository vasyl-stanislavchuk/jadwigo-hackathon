/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Play_Save_NoteInputs */
/**
* | output |
* | --- |
* | "For a grown-up: sign in, and this lesson stays on your child's account." |
*
* @param {Play_Save_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_save_note: ((inputs?: Play_Save_NoteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Save_NoteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Save_NoteInputs = {};
