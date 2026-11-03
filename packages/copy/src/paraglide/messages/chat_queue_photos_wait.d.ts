/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Queue_Photos_WaitInputs */
/**
* | output |
* | --- |
* | "I'll send photos after this answer." |
*
* @param {Chat_Queue_Photos_WaitInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_queue_photos_wait: ((inputs?: Chat_Queue_Photos_WaitInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Queue_Photos_WaitInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Queue_Photos_WaitInputs = {};
