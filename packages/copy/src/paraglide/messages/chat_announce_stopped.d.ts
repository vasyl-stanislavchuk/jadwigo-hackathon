/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Announce_StoppedInputs */
/**
* | output |
* | --- |
* | "Saved, stopped." |
*
* @param {Chat_Announce_StoppedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_announce_stopped: ((inputs?: Chat_Announce_StoppedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Announce_StoppedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Announce_StoppedInputs = {};
