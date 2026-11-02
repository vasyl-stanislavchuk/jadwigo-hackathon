/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown>, last: NonNullable<unknown> }} Chat_Tool_SummaryInputs */
/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{n} step · last: {last}" |
* | "other" | "{n} steps · last: {last}" |
*
* @param {Chat_Tool_SummaryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_summary: ((inputs: Chat_Tool_SummaryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_SummaryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_SummaryInputs = {
    n: NonNullable<unknown>;
    last: NonNullable<unknown>;
};
