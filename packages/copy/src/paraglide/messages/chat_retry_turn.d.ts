/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Retry_TurnInputs */
/**
* | output |
* | --- |
* | "Try again" |
*
* @param {Chat_Retry_TurnInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_retry_turn: ((inputs?: Chat_Retry_TurnInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Retry_TurnInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Retry_TurnInputs = {};
