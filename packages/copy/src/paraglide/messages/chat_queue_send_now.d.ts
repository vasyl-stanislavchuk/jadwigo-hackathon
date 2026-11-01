/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Queue_Send_NowInputs */
/**
* | output |
* | --- |
* | "Send now" |
*
* @param {Chat_Queue_Send_NowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_queue_send_now: ((inputs?: Chat_Queue_Send_NowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Queue_Send_NowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Queue_Send_NowInputs = {};
