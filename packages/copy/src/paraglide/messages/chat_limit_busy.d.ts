/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Limit_BusyInputs */
/**
* | output |
* | --- |
* | "A lot of messages are coming in. Try again in a moment." |
*
* @param {Chat_Limit_BusyInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_limit_busy: ((inputs?: Chat_Limit_BusyInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Limit_BusyInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Limit_BusyInputs = {};
