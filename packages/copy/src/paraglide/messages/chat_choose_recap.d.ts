/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ question: NonNullable<unknown>, answer: NonNullable<unknown> }} Chat_Choose_RecapInputs */
/**
* | output |
* | --- |
* | "{question} · {answer}" |
*
* @param {Chat_Choose_RecapInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_recap: ((inputs: Chat_Choose_RecapInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Choose_RecapInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Choose_RecapInputs = {
    question: NonNullable<unknown>;
    answer: NonNullable<unknown>;
};
