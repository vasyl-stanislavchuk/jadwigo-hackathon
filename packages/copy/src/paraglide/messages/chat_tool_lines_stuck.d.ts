/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Tool_Lines_StuckInputs */
/**
* | output |
* | --- |
* | "Steps that got stuck" |
*
* @param {Chat_Tool_Lines_StuckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_lines_stuck: ((inputs?: Chat_Tool_Lines_StuckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_Lines_StuckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_Lines_StuckInputs = {};
