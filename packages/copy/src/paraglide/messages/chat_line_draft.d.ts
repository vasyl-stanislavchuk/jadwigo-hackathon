/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, topic: NonNullable<unknown> }} Chat_Line_DraftInputs */
/**
* | q_noun | output |
* | --- | --- |
* | "one" | "Built {n} question on {topic}" |
* | "other" | "Built {n} questions on {topic}" |
*
* @param {Chat_Line_DraftInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_line_draft: ((inputs: Chat_Line_DraftInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Line_DraftInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Line_DraftInputs = {
    n: NonNullable<unknown>;
    topic: NonNullable<unknown>;
};
