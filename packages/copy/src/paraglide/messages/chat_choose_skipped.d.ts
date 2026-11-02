/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ question: NonNullable<unknown> }} Chat_Choose_SkippedInputs */
/**
* | output |
* | --- |
* | "{question} · skipped" |
*
* @param {Chat_Choose_SkippedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_choose_skipped: ((inputs: Chat_Choose_SkippedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Choose_SkippedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Choose_SkippedInputs = {
    question: NonNullable<unknown>;
};
