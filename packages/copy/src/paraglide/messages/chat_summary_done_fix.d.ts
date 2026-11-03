/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Summary_Done_FixInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Done, {n} question to fix" |
* | "other" | "Done, {n} questions to fix" |
*
* @param {Chat_Summary_Done_FixInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_summary_done_fix: ((inputs: Chat_Summary_Done_FixInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Summary_Done_FixInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Summary_Done_FixInputs = {
    n: NonNullable<unknown>;
};
