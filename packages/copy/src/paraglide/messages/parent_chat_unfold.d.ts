/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Chat_UnfoldInputs */
/**
* | output |
* | --- |
* | "Unfold the chat" |
*
* @param {Parent_Chat_UnfoldInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_chat_unfold: ((inputs?: Parent_Chat_UnfoldInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Chat_UnfoldInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Chat_UnfoldInputs = {};
