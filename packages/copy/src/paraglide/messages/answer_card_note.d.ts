/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Answer_Card_NoteInputs */
/**
* | output |
* | --- |
* | "Fill in the whole circle next to one letter, with a black pen." |
*
* @param {Answer_Card_NoteInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const answer_card_note: ((inputs?: Answer_Card_NoteInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Answer_Card_NoteInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Answer_Card_NoteInputs = {};
