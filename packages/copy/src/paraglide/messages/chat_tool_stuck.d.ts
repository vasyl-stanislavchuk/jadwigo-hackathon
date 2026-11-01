/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ message: NonNullable<unknown> }} Chat_Tool_StuckInputs */
/**
* | output |
* | --- |
* | "didn't work: {message}" |
*
* @param {Chat_Tool_StuckInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_tool_stuck: ((inputs: Chat_Tool_StuckInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Tool_StuckInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Tool_StuckInputs = {
    message: NonNullable<unknown>;
};
