/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Your_AnswerInputs */
/**
* | output |
* | --- |
* | "Your answer" |
*
* @param {Ds_Your_AnswerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_your_answer: ((inputs?: Ds_Your_AnswerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Your_AnswerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Your_AnswerInputs = {};
