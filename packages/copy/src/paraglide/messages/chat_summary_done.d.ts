/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Summary_DoneInputs */
/**
* | stages_noun | output |
* | --- | --- |
* | "one" | "Done in {n} stage" |
* | "other" | "Done in {n} stages" |
*
* @param {Chat_Summary_DoneInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_done: ((inputs: Chat_Summary_DoneInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Summary_DoneInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Summary_DoneInputs = {
    n: NonNullable<unknown>;
};
