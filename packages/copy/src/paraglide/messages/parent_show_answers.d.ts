/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Show_AnswersInputs */
/**
* | output |
* | --- |
* | "Show answers" |
*
* @param {Parent_Show_AnswersInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_show_answers: ((inputs?: Parent_Show_AnswersInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Show_AnswersInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Show_AnswersInputs = {};
