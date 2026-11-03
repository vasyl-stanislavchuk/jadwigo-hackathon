/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Phase_Queued_LineInputs */
/**
* | output |
* | --- |
* | "Starting in a moment." |
*
* @param {Chat_Phase_Queued_LineInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_queued_line: ((inputs?: Chat_Phase_Queued_LineInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_Queued_LineInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_Queued_LineInputs = {};
