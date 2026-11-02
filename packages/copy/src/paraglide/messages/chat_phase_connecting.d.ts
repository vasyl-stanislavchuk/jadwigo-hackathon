/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Phase_ConnectingInputs */
/**
* | output |
* | --- |
* | "Connecting…" |
*
* @param {Chat_Phase_ConnectingInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_phase_connecting: ((inputs?: Chat_Phase_ConnectingInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Phase_ConnectingInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Phase_ConnectingInputs = {};
