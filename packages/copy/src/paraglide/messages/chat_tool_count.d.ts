/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Chat_Tool_CountInputs */
/**
* | steps_noun | output |
* | --- | --- |
* | "one" | "{n} step" |
* | "other" | "{n} steps" |
*
* @param {Chat_Tool_CountInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_count: ((inputs: Chat_Tool_CountInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_CountInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_CountInputs = {
    n: NonNullable<unknown>;
};
